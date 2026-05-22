"use strict";
// CLI: post-action handoff orchestrator.
// Env: AUTOMATION_MODE, SOURCE_ACTION, SOURCE_CONCLUSION, TARGET_NUMBER,
//      NEXT_TARGET_NUMBER, AUTOMATION_CURRENT_ROUND, AUTOMATION_MAX_ROUNDS,
//      GITHUB_REPOSITORY, DEFAULT_BRANCH, REQUESTED_BY, REQUEST_TEXT,
//      SESSION_BUNDLE_MODE, SOURCE_RUN_ID, PLANNER_RESPONSE_FILE, TARGET_KIND,
//      BASE_BRANCH, BASE_PR, AGENT_COLLAPSE_OLD_REVIEWS, AGENT_ALLOW_SELF_APPROVE,
//      AGENT_ALLOW_SELF_MERGE
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const github_js_1 = require("../github.js");
const output_js_1 = require("../output.js");
const handoff_js_1 = require("../handoff.js");
const orchestrator_capabilities_js_1 = require("../orchestrator-capabilities.js");
const review_summary_minimize_js_1 = require("../review-summary-minimize.js");
const sub_orchestration_js_1 = require("../sub-orchestration.js");
const SUB_ORCHESTRATION_ADOPTION_COMMENT_MARKER = "<!-- sepo-sub-orchestrator-adoption -->";
const ORCHESTRATE_STOP_MARKER = "<!-- sepo-agent-orchestrate-stop -->";
const TERMINAL_SUB_ORCHESTRATION_STOP_MARKER_PREFIX = "sepo-sub-orchestrator-terminal-stop";
const PENDING_MARKER_TTL_MS = 60 * 60 * 1000;
const UNSATISFACTORY_ACTION_CONCLUSIONS = new Set(["no_changes", "failed", "verify_failed", "unsupported"]);
function positiveInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function parsePositiveTargetNumber(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
function parseOptionalChildIssueNumber(value) {
    const text = String(value || "").trim();
    if (!text)
        return 0;
    if (!/^\d+$/.test(text)) {
        throw new Error(`child_issue_number must be a positive issue number: ${text}`);
    }
    const parsed = Number.parseInt(text, 10);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        throw new Error(`child_issue_number must be a positive issue number: ${text}`);
    }
    return parsed;
}
function formatSubOrchestrationSelectionComment(input) {
    const stage = (0, sub_orchestration_js_1.normalizeSubOrchestratorStage)(input.stage);
    return [
        "Sepo is starting a focused child task for this orchestration.",
        "",
        ...(0, handoff_js_1.formatTransposedMarkdownTable)(["Child task", "Focus", "Parent issue", "Status"], [`#${input.childIssue}`, stage, `#${input.parentIssue}`, "Running"]),
        "",
        "I'll report back here when the child task finishes.",
        "",
        (0, sub_orchestration_js_1.formatSubOrchestratorChildLinkMarker)({ parent: input.parentIssue, stage, child: input.childIssue }),
    ].join("\n");
}
function formatSubOrchestrationOutcome(state) {
    switch (state) {
        case "done":
            return "Ready to ship";
        case "blocked":
            return "Blocked";
        case "failed":
            return "Failed";
        case "running":
            return "Running";
    }
}
function formatSubOrchestrationProgressComment(input) {
    const headers = ["Child task"];
    const values = [`#${input.childIssue}`];
    if (input.prNumber) {
        headers.push("PR");
        values.push(`#${input.prNumber}`);
    }
    headers.push("Outcome", "Parent round", "Next step");
    values.push(formatSubOrchestrationOutcome(input.resultState), `${input.parentRound} / ${input.maxRounds}`, "Resuming parent orchestration");
    return [
        "Child task completed.",
        "",
        ...(0, handoff_js_1.formatTransposedMarkdownTable)(headers, values),
        "",
        `Summary: ${input.summary || "No summary provided."}`,
        "",
        input.marker,
    ].join("\n");
}
function formatActorLoginForMessage(login) {
    const text = String(login || "").trim();
    return text ? `\`${text}\`` : "unknown author";
}
function formatTerminalSubOrchestrationStopMarker(input) {
    return `<!-- ${TERMINAL_SUB_ORCHESTRATION_STOP_MARKER_PREFIX} child:${input.childIssue} parent:${input.parentIssue} -->`;
}
function formatTerminalSubOrchestrationStopComment(input) {
    const headers = ["Child issue"];
    const values = [`#${input.rejection.issue.number}`];
    if (input.prNumber) {
        headers.push("PR");
        values.push(`#${input.prNumber}`);
    }
    headers.push("Parent issue", "Marker source", "Status");
    values.push(`#${input.rejection.marker.parent}`, input.rejection.sourceLabel, "Stopped");
    return [
        "Sepo could not report this terminal child result to the parent.",
        "",
        ...(0, handoff_js_1.formatTransposedMarkdownTable)(headers, values),
        "",
        `Reason: ${input.rejection.reason}`,
        "",
        "No parent workflow was dispatched. Review the child marker before continuing manually.",
        "",
        input.marker,
    ].join("\n");
}
function errorText(err) {
    const record = err;
    return [record.message, record.stderr, record.stdout]
        .map((part) => {
        if (Buffer.isBuffer(part))
            return part.toString("utf8");
        return typeof part === "string" ? part : "";
    })
        .filter(Boolean)
        .join("\n") || String(err);
}
function extractLogin(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return "";
    const login = value.login;
    return typeof login === "string" ? login.trim() : "";
}
function authorLoginFromRecord(record) {
    return extractLogin(record.author) || extractLogin(record.user);
}
function normalizeActorLogin(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/^app\//i, "")
        .replace(/\[bot\]$/i, "");
}
let authenticatedActorLogin = null;
function fetchAuthenticatedActorLogin() {
    if (authenticatedActorLogin !== null)
        return authenticatedActorLogin;
    const raw = (0, github_js_1.gh)([
        "api",
        "graphql",
        "-f",
        "query=query ViewerLogin { viewer { login } }",
    ]).trim();
    const parsed = JSON.parse(raw || "{}");
    const login = String(parsed.data?.viewer?.login || parsed.viewer?.login || "").trim();
    if (!login)
        throw new Error("Could not resolve authenticated GitHub actor login");
    authenticatedActorLogin = login;
    return authenticatedActorLogin;
}
function isTrustedActorLogin(authorLogin) {
    const normalizedAuthor = normalizeActorLogin(authorLogin);
    if (!normalizedAuthor)
        return false;
    return normalizedAuthor === normalizeActorLogin(fetchAuthenticatedActorLogin());
}
function isTrustedIssueRecord(issue) {
    return isTrustedActorLogin(issue.authorLogin || "");
}
function normalizeCommentRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return null;
    const record = value;
    return {
        id: record.id,
        body: String(record.body || ""),
        authorLogin: authorLoginFromRecord(record),
    };
}
function fetchIssueComments(repo, issueNumber) {
    const raw = (0, github_js_1.gh)([
        "api",
        "--paginate",
        "--slurp",
        `repos/${repo}/issues/${issueNumber}/comments`,
    ]).trim();
    if (!raw)
        return [];
    const parsed = JSON.parse(raw);
    const pages = Array.isArray(parsed) ? parsed : [parsed];
    const comments = [];
    for (const page of pages) {
        const entries = Array.isArray(page) ? page : [page];
        for (const entry of entries) {
            const comment = normalizeCommentRecord(entry);
            if (comment)
                comments.push(comment);
        }
    }
    return comments;
}
function findHandoffMarkers(repo, issueNumber, dedupeKey) {
    return fetchIssueComments(repo, issueNumber)
        .map((comment) => {
        const parsed = (0, handoff_js_1.parseHandoffMarker)(comment.body || "", dedupeKey);
        if (!parsed || !isTrustedActorLogin(comment.authorLogin || ""))
            return null;
        return {
            id: String(comment.id || ""),
            ...parsed,
        };
    })
        .filter((marker) => Boolean(marker?.id));
}
function createIssueComment(repo, issueNumber, body) {
    return (0, github_js_1.gh)([
        "api",
        "--method",
        "POST",
        `repos/${repo}/issues/${issueNumber}/comments`,
        "-f",
        `body=${body}`,
        "--jq",
        ".id",
    ]).trim();
}
function updateIssueComment(repo, commentId, body) {
    (0, github_js_1.gh)([
        "api",
        "--method",
        "PATCH",
        `repos/${repo}/issues/comments/${commentId}`,
        "-f",
        `body=${body}`,
    ]);
}
function fetchIssue(repoSlug, issueNumber) {
    try {
        return fetchIssueStrict(repoSlug, issueNumber);
    }
    catch {
        return null;
    }
}
function fetchIssueStrict(repoSlug, issueNumber) {
    const raw = (0, github_js_1.gh)([
        "issue",
        "view",
        String(issueNumber),
        "--repo",
        repoSlug,
        "--json",
        "number,title,body,author,state,url",
    ]).trim();
    if (!raw)
        throw new Error(`empty issue response for #${issueNumber}`);
    const parsed = JSON.parse(raw);
    return {
        number: Number(parsed.number || issueNumber),
        title: String(parsed.title || ""),
        body: String(parsed.body || ""),
        authorLogin: authorLoginFromRecord(parsed),
        state: String(parsed.state || ""),
        url: String(parsed.url || ""),
    };
}
function withTempBodyFile(body, fn) {
    const dir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "sepo-sub-orchestrator-"));
    try {
        const file = (0, node_path_1.join)(dir, "body.md");
        (0, node_fs_1.writeFileSync)(file, body, "utf8");
        return fn(file);
    }
    finally {
        (0, node_fs_1.rmSync)(dir, { recursive: true, force: true });
    }
}
function updateIssueBody(repoSlug, issueNumber, body) {
    withTempBodyFile(body, (bodyFile) => {
        (0, github_js_1.gh)(["issue", "edit", String(issueNumber), "--repo", repoSlug, "--body-file", bodyFile]);
    });
}
function createIssueFromBody(repoSlug, title, body) {
    return withTempBodyFile(body, (bodyFile) => (0, github_js_1.gh)([
        "issue",
        "create",
        "--repo",
        repoSlug,
        "--title",
        title,
        "--body-file",
        bodyFile,
    ]).trim());
}
function parseIssueNumberFromUrl(url) {
    const match = String(url || "").trim().match(/\/issues\/(\d+)(?:\D*)?$/);
    return match ? match[1] : "";
}
function trustedSubOrchestratorMarkerFromBody(issue) {
    const marker = (0, sub_orchestration_js_1.parseSubOrchestratorMarker)(issue.body);
    if (!marker || !isTrustedIssueRecord(issue))
        return null;
    return { marker, sourceKind: "body", body: issue.body };
}
function isSubOrchestrationAdoptionComment(body) {
    const text = String(body || "").trim();
    return (text.startsWith("Sepo adopted this issue as a sub-orchestrator child of #") &&
        text.includes(SUB_ORCHESTRATION_ADOPTION_COMMENT_MARKER));
}
function trustedSubOrchestratorMarkerFromComments(repoSlug, issueNumber) {
    for (const comment of [...fetchIssueComments(repoSlug, issueNumber)].reverse()) {
        const body = comment.body || "";
        const marker = (0, sub_orchestration_js_1.parseSubOrchestratorMarker)(body);
        if (!marker ||
            !comment.id ||
            !isTrustedActorLogin(comment.authorLogin || "") ||
            !isSubOrchestrationAdoptionComment(body)) {
            continue;
        }
        return {
            marker,
            sourceKind: "comment",
            body,
            commentId: String(comment.id),
        };
    }
    return null;
}
function trustedSubOrchestrationIssue(repoSlug, issue) {
    const subOrchestrator = trustedSubOrchestratorMarkerFromBody(issue) ||
        trustedSubOrchestratorMarkerFromComments(repoSlug, issue.number);
    return subOrchestrator ? { ...issue, subOrchestrator } : null;
}
function resolveTerminalSubOrchestrationIssue(repoSlug, issue) {
    let rejection = null;
    const bodyMarker = (0, sub_orchestration_js_1.parseSubOrchestratorMarker)(issue.body);
    if (bodyMarker) {
        if (isTrustedIssueRecord(issue)) {
            return {
                kind: "trusted",
                issue: {
                    ...issue,
                    subOrchestrator: { marker: bodyMarker, sourceKind: "body", body: issue.body },
                },
            };
        }
        rejection = {
            issue,
            marker: bodyMarker,
            sourceLabel: "Issue body",
            reason: `The child issue body marker was authored by ${formatActorLoginForMessage(issue.authorLogin)}, not the authenticated Sepo actor.`,
            warning: `Ignoring untrusted terminal sub-orchestrator marker in issue #${issue.number} body from ${issue.authorLogin || "unknown author"}`,
        };
    }
    for (const comment of [...fetchIssueComments(repoSlug, issue.number)].reverse()) {
        const body = comment.body || "";
        const marker = (0, sub_orchestration_js_1.parseSubOrchestratorMarker)(body);
        if (!marker || !isSubOrchestrationAdoptionComment(body)) {
            continue;
        }
        if (!comment.id) {
            rejection ??= {
                issue,
                marker,
                sourceLabel: "Adoption comment",
                reason: "The child adoption marker comment is missing a GitHub comment id, so Sepo cannot safely update it.",
                warning: `Ignoring unresolvable terminal sub-orchestrator adoption marker in issue #${issue.number} comment unknown from ${comment.authorLogin || "unknown author"}`,
            };
            continue;
        }
        if (!isTrustedActorLogin(comment.authorLogin || "")) {
            rejection ??= {
                issue,
                marker,
                sourceLabel: `Adoption comment ${comment.id}`,
                reason: `The child adoption marker comment was authored by ${formatActorLoginForMessage(comment.authorLogin)}, not the authenticated Sepo actor.`,
                warning: `Ignoring untrusted terminal sub-orchestrator adoption marker in issue #${issue.number} comment ${comment.id || "unknown"} from ${comment.authorLogin || "unknown author"}`,
            };
            continue;
        }
        return {
            kind: "trusted",
            issue: {
                ...issue,
                subOrchestrator: {
                    marker,
                    sourceKind: "comment",
                    body,
                    commentId: String(comment.id),
                },
            },
        };
    }
    return rejection ? { kind: "rejected", rejection } : { kind: "none" };
}
function updateTrustedSubOrchestratorMarker(repoSlug, issue, body) {
    if (issue.subOrchestrator.sourceKind === "body") {
        updateIssueBody(repoSlug, issue.number, body);
        return;
    }
    if (!issue.subOrchestrator.commentId) {
        throw new Error(`child issue #${issue.number} marker comment is missing an id`);
    }
    updateIssueComment(repoSlug, issue.subOrchestrator.commentId, body);
}
function updateSubOrchestrationParentRound(repoSlug, issue, parentRound) {
    const updatedBody = (0, sub_orchestration_js_1.updateSubOrchestratorMarkerParentRound)(issue.subOrchestrator.body, parentRound);
    if (updatedBody !== issue.subOrchestrator.body) {
        updateTrustedSubOrchestratorMarker(repoSlug, issue, updatedBody);
    }
}
function findExistingSubOrchestrationIssue(repoSlug, parentIssue, stage) {
    const expectedStage = (0, sub_orchestration_js_1.normalizeSubOrchestratorStage)(stage);
    const raw = (0, github_js_1.gh)([
        "issue",
        "list",
        "--repo",
        repoSlug,
        "--state",
        "open",
        "--search",
        "sepo-sub-orchestrator",
        "--json",
        "number,title,body,author",
        "--limit",
        "100",
    ]).trim();
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) {
        throw new Error("could not parse existing sub-orchestrator issue search results");
    }
    for (const entry of parsed) {
        if (!entry || typeof entry !== "object")
            continue;
        const record = entry;
        const number = parsePositiveTargetNumber(String(record.number || ""));
        const issue = {
            number,
            title: String(record.title || ""),
            body: String(record.body || ""),
            authorLogin: authorLoginFromRecord(record),
        };
        const markerRecord = number ? trustedSubOrchestratorMarkerFromBody(issue) : null;
        const marker = markerRecord?.marker;
        if (markerRecord && marker?.parent === parentIssue && marker.stage === expectedStage && marker.state === "running") {
            return { ...issue, subOrchestrator: markerRecord };
        }
    }
    return null;
}
function findRecordedSubOrchestrationIssue(repoSlug, parentIssue, stage) {
    const expectedStage = (0, sub_orchestration_js_1.normalizeSubOrchestratorStage)(stage);
    const comments = fetchIssueComments(repoSlug, parentIssue);
    for (const comment of [...comments].reverse()) {
        const link = (0, sub_orchestration_js_1.parseSubOrchestratorChildLinkMarker)(comment.body || "");
        if (!link || link.parent !== parentIssue || link.stage !== expectedStage)
            continue;
        if (!isTrustedActorLogin(comment.authorLogin || ""))
            continue;
        const existing = fetchIssue(repoSlug, link.child);
        if (!existing)
            throw new Error(`Could not read recorded child issue #${link.child}`);
        const subIssue = trustedSubOrchestrationIssue(repoSlug, existing);
        if (!subIssue) {
            throw new Error(`recorded child issue #${link.child} is missing a trusted sepo-sub-orchestrator marker`);
        }
        validateReusableChildIssue(subIssue, parentIssue, stage);
        return subIssue;
    }
    return null;
}
function hasRecordedSubOrchestrationIssue(repoSlug, parentIssue, stage, childIssue) {
    const expectedStage = (0, sub_orchestration_js_1.normalizeSubOrchestratorStage)(stage);
    return fetchIssueComments(repoSlug, parentIssue).some((comment) => {
        const link = (0, sub_orchestration_js_1.parseSubOrchestratorChildLinkMarker)(comment.body || "");
        return Boolean(link &&
            link.parent === parentIssue &&
            link.stage === expectedStage &&
            link.child === childIssue &&
            isTrustedActorLogin(comment.authorLogin || ""));
    });
}
function fetchIssueDatabaseId(repoSlug, issueNumber) {
    const raw = (0, github_js_1.gh)([
        "api",
        `repos/${repoSlug}/issues/${issueNumber}`,
        "--jq",
        ".id",
    ]).trim();
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        throw new Error(`could not resolve database id for issue #${issueNumber}`);
    }
    return parsed;
}
function hasGitHubSubIssueRelation(repoSlug, parentIssue, childIssue) {
    try {
        const raw = (0, github_js_1.gh)([
            "api",
            "--paginate",
            `repos/${repoSlug}/issues/${parentIssue}/sub_issues`,
            "--jq",
            ".[].number",
        ]).trim();
        return raw.split(/\r?\n/).some((line) => parsePositiveTargetNumber(line) === childIssue);
    }
    catch {
        return false;
    }
}
function ensureGitHubSubIssueRelation(repoSlug, parentIssue, childIssue) {
    if (hasGitHubSubIssueRelation(repoSlug, parentIssue, childIssue))
        return;
    try {
        const childIssueId = fetchIssueDatabaseId(repoSlug, childIssue);
        (0, github_js_1.gh)([
            "api",
            "--method",
            "POST",
            `repos/${repoSlug}/issues/${parentIssue}/sub_issues`,
            "-F",
            `sub_issue_id=${childIssueId}`,
            "--silent",
        ]);
    }
    catch (err) {
        console.warn(`Could not link child issue #${childIssue} as a GitHub sub-issue of #${parentIssue}: ${errorText(err)}`);
    }
}
function recordSubOrchestrationIssue(repoSlug, parentIssue, stage, childIssue) {
    if (!hasRecordedSubOrchestrationIssue(repoSlug, parentIssue, stage, childIssue)) {
        createIssueComment(repoSlug, parentIssue, formatSubOrchestrationSelectionComment({
            parentIssue,
            stage,
            childIssue,
        }));
    }
    ensureGitHubSubIssueRelation(repoSlug, parentIssue, childIssue);
}
function formatSubOrchestrationAdoptionComment(input) {
    const stage = (0, sub_orchestration_js_1.normalizeSubOrchestratorStage)(input.stage);
    return [
        `Sepo adopted this issue as a sub-orchestrator child of #${input.parentIssue}.`,
        "",
        ...(0, handoff_js_1.formatTransposedMarkdownTable)(["Parent issue", "Stage", "Parent round", "Status"], [`#${input.parentIssue}`, stage, input.parentRound, "Running"]),
        "",
        (0, sub_orchestration_js_1.formatSubOrchestratorMarker)({
            parent: input.parentIssue,
            stage,
            parentRound: input.parentRound,
        }),
        SUB_ORCHESTRATION_ADOPTION_COMMENT_MARKER,
    ].join("\n");
}
function adoptExistingSubOrchestrationIssue(repoSlug, existing, parentIssue, stage, parentRound) {
    if (existing.number === parentIssue) {
        throw new Error(`child issue #${existing.number} cannot be the parent issue`);
    }
    const body = formatSubOrchestrationAdoptionComment({ parentIssue, stage, parentRound });
    const commentId = createIssueComment(repoSlug, existing.number, body);
    const marker = (0, sub_orchestration_js_1.parseSubOrchestratorMarker)(body);
    if (!marker)
        throw new Error(`could not create sub-orchestrator marker for child issue #${existing.number}`);
    return {
        ...existing,
        subOrchestrator: {
            marker,
            sourceKind: "comment",
            body,
            commentId,
        },
    };
}
function validateExplicitChildIssueTarget(existing) {
    if (/\/pull\/\d+(?:\D*)?$/.test(existing.url || "")) {
        throw new Error(`child_issue_number #${existing.number} is a pull request, not an issue`);
    }
    if (!/\/issues\/\d+(?:\D*)?$/.test(existing.url || "")) {
        throw new Error(`child_issue_number #${existing.number} could not be verified as an issue`);
    }
    const state = String(existing.state || "").trim().toUpperCase();
    if (state !== "OPEN") {
        throw new Error(`child_issue_number #${existing.number} is ${state ? state.toLowerCase() : "not open"}, not open`);
    }
}
function validateReusableChildIssue(existing, parentIssue, stage) {
    const marker = existing.subOrchestrator.marker;
    const expectedStage = (0, sub_orchestration_js_1.normalizeSubOrchestratorStage)(stage);
    if (marker.parent !== parentIssue) {
        throw new Error(`child issue #${existing.number} belongs to parent #${marker.parent}, not #${parentIssue}`);
    }
    if (marker.stage !== expectedStage) {
        throw new Error(`child issue #${existing.number} is stage ${marker.stage}, not ${expectedStage}`);
    }
    if (marker.state !== "running") {
        throw new Error(`child issue #${existing.number} is ${marker.state}, not reusable`);
    }
}
function resolveEffectiveBaseInputs(decision) {
    return {
        baseBranch: decision.baseBranch || baseBranch,
        basePr: decision.basePr || basePr,
    };
}
function ensureSubOrchestrationIssue(decision) {
    const parentIssue = parsePositiveTargetNumber(targetNumber);
    if (!parentIssue)
        throw new Error(`Invalid parent issue number: ${targetNumber}`);
    const { baseBranch: effectiveBaseBranch, basePr: effectiveBasePr } = resolveEffectiveBaseInputs(decision);
    if (effectiveBaseBranch && effectiveBasePr) {
        throw new Error("set only one of base_branch or base_pr for child orchestration");
    }
    const stage = decision.childStage || `stage-${decision.nextRound - 1}`;
    const instructions = decision.childInstructions || decision.handoffContext || requestText;
    const existingIssueNumber = parseOptionalChildIssueNumber(decision.childIssueNumber);
    const parentRound = decision.nextRound;
    if (existingIssueNumber) {
        const existing = fetchIssue(repo, existingIssueNumber);
        if (!existing)
            throw new Error(`Could not read child issue #${existingIssueNumber}`);
        validateExplicitChildIssueTarget(existing);
        const trustedIssue = trustedSubOrchestrationIssue(repo, existing);
        const childIssue = trustedIssue || adoptExistingSubOrchestrationIssue(repo, existing, parentIssue, stage, parentRound);
        validateReusableChildIssue(childIssue, parentIssue, stage);
        updateSubOrchestrationParentRound(repo, childIssue, parentRound);
        recordSubOrchestrationIssue(repo, parentIssue, stage, childIssue.number);
        return String(existingIssueNumber);
    }
    const recordedIssue = findRecordedSubOrchestrationIssue(repo, parentIssue, stage);
    if (recordedIssue) {
        updateSubOrchestrationParentRound(repo, recordedIssue, parentRound);
        ensureGitHubSubIssueRelation(repo, parentIssue, recordedIssue.number);
        return String(recordedIssue.number);
    }
    const reusableIssue = findExistingSubOrchestrationIssue(repo, parentIssue, stage);
    if (reusableIssue) {
        updateSubOrchestrationParentRound(repo, reusableIssue, parentRound);
        recordSubOrchestrationIssue(repo, parentIssue, stage, reusableIssue.number);
        return String(reusableIssue.number);
    }
    const title = `Sub-orchestrator: ${stage}`;
    const body = (0, sub_orchestration_js_1.formatSubOrchestrationIssueBody)({
        parentIssue,
        stage,
        taskInstructions: instructions,
        baseBranch: effectiveBaseBranch,
        basePr: effectiveBasePr,
        parentRound,
    });
    const createdUrl = createIssueFromBody(repo, title, body);
    const createdNumber = parseIssueNumberFromUrl(createdUrl);
    if (!createdNumber)
        throw new Error(`Could not parse created child issue URL: ${createdUrl}`);
    recordSubOrchestrationIssue(repo, parentIssue, stage, parsePositiveTargetNumber(createdNumber));
    return createdNumber;
}
const repo = process.env.GITHUB_REPOSITORY || "";
const ref = process.env.DEFAULT_BRANCH || "";
const sourceAction = process.env.SOURCE_ACTION || "";
const sourceConclusion = process.env.SOURCE_CONCLUSION || "unknown";
const sourceRunId = process.env.SOURCE_RUN_ID || process.env.GITHUB_RUN_ID || "";
const sourceRecommendedNextStep = process.env.SOURCE_RECOMMENDED_NEXT_STEP || "";
const sourceHandoffContext = process.env.SOURCE_HANDOFF_CONTEXT || "";
const sourceTargetKind = process.env.TARGET_KIND || "";
const sourceAssociationRaw = process.env.AUTHOR_ASSOCIATION || "";
const accessPolicyRaw = process.env.ACCESS_POLICY || "";
const isPublicRepo = String(process.env.REPOSITORY_PRIVATE || "").trim().toLowerCase() === "false";
const targetNumber = process.env.TARGET_NUMBER || "";
const requestedBy = process.env.REQUESTED_BY || "";
const requestText = process.env.REQUEST_TEXT || "";
const sessionBundleMode = process.env.SESSION_BUNDLE_MODE || "";
const baseBranch = process.env.BASE_BRANCH || "";
const basePr = process.env.BASE_PR || "";
const maxRounds = positiveInt(process.env.AUTOMATION_MAX_ROUNDS || "", 12);
const currentRound = positiveInt(process.env.AUTOMATION_CURRENT_ROUND || "", 1);
const automationMode = (0, handoff_js_1.normalizeAutomationMode)(process.env.AUTOMATION_MODE || "disabled");
const allowSelfApprove = ["true", "1", "yes", "on"].includes(normalizeToken(process.env.AGENT_ALLOW_SELF_APPROVE || ""));
const allowSelfMerge = ["true", "1", "yes", "on"].includes(normalizeToken(process.env.AGENT_ALLOW_SELF_MERGE || ""));
const collapseOldReviews = !["false", "0", "no", "off"].includes((process.env.AGENT_COLLAPSE_OLD_REVIEWS || "").trim().toLowerCase());
function manualPrChangesRequestedFixPrHandoffContext() {
    return [
        "Address the latest unresolved requested-change review comments on this pull request.",
        "Treat those requested-change comments as the selected fix-pr task; do not use review-synthesis-only defaults when no synthesis exists.",
        "Ignore optional INFO notes, metadata-only polish, already-fixed findings, and human-judgment nits unless required by the requested changes.",
    ].join(" ");
}
function fallbackFixPrHandoffContext() {
    const explicitContext = sourceHandoffContext.trim();
    if (explicitContext)
        return explicitContext;
    const normalizedSourceAction = normalizeToken(sourceAction);
    if (normalizedSourceAction === "orchestrate" && normalizeToken(sourceTargetKind) === "pull_request") {
        return manualPrChangesRequestedFixPrHandoffContext();
    }
    if (normalizedSourceAction === "review") {
        return (0, handoff_js_1.defaultFixPrHandoffContext)();
    }
    return "";
}
function readPlannerDecision() {
    const responseFile = process.env.PLANNER_RESPONSE_FILE || "";
    if (!responseFile)
        return null;
    try {
        return (0, handoff_js_1.parsePlannerDecision)((0, node_fs_1.readFileSync)(responseFile, "utf8"));
    }
    catch {
        return null;
    }
}
function normalizeToken(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}
function readPrStatus(repoSlug, prNumber) {
    try {
        const raw = (0, github_js_1.gh)([
            "pr",
            "view",
            prNumber,
            "--repo",
            repoSlug,
            "--json",
            "state,reviewDecision",
        ]).trim();
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        return {
            state: String(parsed.state || "").trim().toUpperCase(),
            reviewDecision: String(parsed.reviewDecision || "").trim().toUpperCase(),
        };
    }
    catch {
        return null;
    }
}
function readPrBodyStrict(repoSlug, prNumber) {
    const raw = (0, github_js_1.gh)(["pr", "view", prNumber, "--repo", repoSlug, "--json", "body"]).trim();
    if (!raw)
        throw new Error(`empty pull request response for #${prNumber}`);
    const parsed = JSON.parse(raw);
    return String(parsed.body || "");
}
function resolveChildIssueForTerminal() {
    const normalizedKind = normalizeToken(sourceTargetKind);
    const currentNumber = parsePositiveTargetNumber(targetNumber);
    if (!repo || !currentNumber)
        return { kind: "none" };
    if (normalizedKind === "issue") {
        return resolveTerminalSubOrchestrationIssue(repo, fetchIssueStrict(repo, currentNumber));
    }
    if (normalizedKind === "pull_request") {
        const linkedIssueNumber = (0, sub_orchestration_js_1.extractClosingIssueNumber)(readPrBodyStrict(repo, targetNumber), repo);
        if (!linkedIssueNumber)
            return { kind: "none" };
        return resolveTerminalSubOrchestrationIssue(repo, fetchIssueStrict(repo, linkedIssueNumber));
    }
    return { kind: "none" };
}
function hasTrustedTerminalSubOrchestrationStopComment(repoSlug, issueNumber, marker) {
    try {
        return fetchIssueComments(repoSlug, issueNumber).some((comment) => String(comment.body || "").includes(marker) && isTrustedActorLogin(comment.authorLogin || ""));
    }
    catch (err) {
        console.warn(`Failed to inspect existing terminal sub-orchestration stop comments: ${errorText(err)}`);
        return false;
    }
}
function commentOnTerminalSubOrchestrationRejection(rejection) {
    console.warn(rejection.warning);
    const target = parsePositiveTargetNumber(targetNumber);
    if (!repo || !target || !["issue", "pull_request"].includes(normalizeToken(sourceTargetKind))) {
        return;
    }
    const marker = formatTerminalSubOrchestrationStopMarker({
        childIssue: rejection.issue.number,
        parentIssue: rejection.marker.parent,
    });
    if (hasTrustedTerminalSubOrchestrationStopComment(repo, target, marker)) {
        return;
    }
    const prNumber = normalizeToken(sourceTargetKind) === "pull_request" ? targetNumber : "";
    createIssueComment(repo, target, formatTerminalSubOrchestrationStopComment({
        rejection,
        prNumber,
        marker,
    }));
}
function reportTerminalToParent(decision) {
    const childResolution = resolveChildIssueForTerminal();
    if (childResolution.kind === "none")
        return;
    if (childResolution.kind === "rejected") {
        commentOnTerminalSubOrchestrationRejection(childResolution.rejection);
        return;
    }
    const childIssue = childResolution.issue;
    const marker = childIssue.subOrchestrator.marker;
    if (!["running", "done", "blocked", "failed"].includes(marker.state))
        return;
    const resultState = marker.state === "running" ? (0, sub_orchestration_js_1.resultStateFromTerminal)({
        sourceAction,
        sourceConclusion,
        reason: decision.reason,
    }) : marker.state;
    const parentRound = marker.parentRound || 1;
    const prNumber = normalizeToken(sourceTargetKind) === "pull_request" ? targetNumber : "";
    const progressMarkerPrefix = `sepo-sub-orchestrator-report child:${childIssue.number}`;
    const pendingProgressMarker = `<!-- ${progressMarkerPrefix} resume:pending -->`;
    const dispatchedProgressMarker = `<!-- ${progressMarkerPrefix} resume:dispatched -->`;
    const progressComments = fetchIssueComments(repo, marker.parent).filter((comment) => String(comment.body || "").includes(progressMarkerPrefix) && isTrustedActorLogin(comment.authorLogin || ""));
    const existingProgress = progressComments[progressComments.length - 1];
    const progressWasDispatched = String(existingProgress?.body || "").includes(dispatchedProgressMarker);
    if (marker.state !== "running" && progressWasDispatched) {
        return;
    }
    let progressCommentId = existingProgress?.id ? String(existingProgress.id) : "";
    const writeProgress = (progressMarker) => {
        const progressBody = formatSubOrchestrationProgressComment({
            childIssue: childIssue.number,
            prNumber,
            resultState,
            parentRound,
            maxRounds,
            summary: decision.reason,
            marker: progressMarker,
        });
        if (progressCommentId) {
            updateIssueComment(repo, progressCommentId, progressBody);
        }
        else {
            progressCommentId = createIssueComment(repo, marker.parent, progressBody);
        }
    };
    if (!progressWasDispatched) {
        writeProgress(pendingProgressMarker);
        (0, github_js_1.dispatchWorkflow)(repo, "agent-orchestrator.yml", ref, {
            source_action: "orchestrate",
            source_conclusion: resultState,
            source_run_id: sourceRunId,
            target_kind: "issue",
            target_number: String(marker.parent),
            requested_by: requestedBy,
            request_text: `Child issue #${childIssue.number} finished with ${resultState === "done" ? "SHIP" : resultState.toUpperCase()}: ${decision.reason}`,
            automation_mode: "agent",
            automation_current_round: String(parentRound),
            automation_max_rounds: String(maxRounds),
            session_bundle_mode: sessionBundleMode,
            base_branch: baseBranch,
            base_pr: basePr,
        });
        writeProgress(dispatchedProgressMarker);
    }
    const updatedChildMarkerBody = marker.state === "running"
        ? (0, sub_orchestration_js_1.updateSubOrchestratorMarkerState)(childIssue.subOrchestrator.body, resultState)
        : childIssue.subOrchestrator.body;
    if (updatedChildMarkerBody !== childIssue.subOrchestrator.body) {
        updateTrustedSubOrchestratorMarker(repo, childIssue, updatedChildMarkerBody);
    }
}
function pushUniqueMarkdownBlock(lines, value) {
    const text = String(value || "").trim();
    if (!text || lines.includes(text))
        return;
    lines.push(text);
}
function formatPlannerClarificationComment(decision) {
    if (decision.plannerDecisionKind !== "blocked") {
        return null;
    }
    const messageLines = [];
    pushUniqueMarkdownBlock(messageLines, decision.userMessage);
    if (decision.clarificationRequest) {
        pushUniqueMarkdownBlock(messageLines, `Clarification request: ${decision.clarificationRequest}`);
    }
    if (!messageLines.length) {
        return null;
    }
    const lines = [
        "Sepo orchestration needs clarification before it can continue.",
        "",
        ...messageLines.flatMap((message, index) => index === 0 ? [message] : ["", message]),
        "",
        `- Source action: \`${sourceAction || "unknown"}\``,
        `- Source conclusion: \`${sourceConclusion || "unknown"}\``,
        `- Target: \`${sourceTargetKind || "unknown"} #${targetNumber || "unknown"}\``,
        `- Round: \`${currentRound}/${maxRounds}\``,
        `- Reason: ${decision.reason}`,
    ];
    if (sourceRunId) {
        lines.push(`- Source run ID: \`${sourceRunId}\``);
    }
    lines.push("", "No follow-up workflow was dispatched. Reply with the requested context, then continue with `/orchestrate`, `/implement`, or `/answer` when ready.", "", ORCHESTRATE_STOP_MARKER);
    return lines.join("\n");
}
function formatPlannerAnswerComment(decision) {
    if (decision.plannerDecisionKind !== "answer") {
        return null;
    }
    const message = String(decision.userMessage || "").trim();
    if (!message)
        return null;
    const lines = [
        "Sepo answered this orchestration request.",
        "",
        message,
        "",
        `- Source action: \`${sourceAction || "unknown"}\``,
        `- Source conclusion: \`${sourceConclusion || "unknown"}\``,
        `- Target: \`${sourceTargetKind || "unknown"} #${targetNumber || "unknown"}\``,
        `- Round: \`${currentRound}/${maxRounds}\``,
        `- Reason: ${decision.reason}`,
    ];
    if (sourceRunId) {
        lines.push(`- Source run ID: \`${sourceRunId}\``);
    }
    lines.push("", ORCHESTRATE_STOP_MARKER);
    return lines.join("\n");
}
function formatOrchestrateStopComment(decision) {
    const clarificationComment = formatPlannerClarificationComment(decision);
    if (clarificationComment) {
        return clarificationComment;
    }
    const answerComment = formatPlannerAnswerComment(decision);
    if (answerComment) {
        return answerComment;
    }
    const lines = [
        `Sepo orchestration stopped after \`${sourceAction || "unknown"}\` concluded \`${sourceConclusion || "unknown"}\`.`,
        "",
        `- Source action: \`${sourceAction || "unknown"}\``,
        `- Source conclusion: \`${sourceConclusion || "unknown"}\``,
        `- Target: \`${sourceTargetKind || "unknown"} #${targetNumber || "unknown"}\``,
        `- Round: \`${currentRound}/${maxRounds}\``,
        `- Reason: ${decision.reason}`,
    ];
    if (sourceRunId) {
        lines.push(`- Source run ID: \`${sourceRunId}\``);
    }
    lines.push("", "No follow-up workflow was dispatched. Inspect the source action status comment and workflow logs before retrying or continuing manually.", "", ORCHESTRATE_STOP_MARKER);
    return lines.join("\n");
}
function hasMatchingOrchestrateStopComment(repoSlug, issueNumber, body) {
    try {
        const expectedBody = body.trim();
        return fetchIssueComments(repoSlug, issueNumber).some((comment) => {
            const commentBody = String(comment.body || "");
            return (commentBody.includes(ORCHESTRATE_STOP_MARKER) &&
                commentBody.trim() === expectedBody &&
                isTrustedActorLogin(comment.authorLogin || ""));
        });
    }
    catch (err) {
        console.warn(`Failed to inspect existing orchestrator stop comments: ${errorText(err)}`);
        return false;
    }
}
function createOrchestrateStopComment(decision) {
    const target = parsePositiveTargetNumber(targetNumber);
    if (!repo || !target || !["issue", "pull_request"].includes(normalizeToken(sourceTargetKind))) {
        return;
    }
    const body = formatOrchestrateStopComment(decision);
    if (hasMatchingOrchestrateStopComment(repo, target, body)) {
        return;
    }
    createIssueComment(repo, target, body);
}
function commentOnInitialOrchestrateStop(decision) {
    if (formatPlannerClarificationComment(decision) || formatPlannerAnswerComment(decision)) {
        return;
    }
    if (normalizeToken(sourceAction) !== "orchestrate" ||
        normalizeToken(sourceConclusion) !== "requested" ||
        currentRound !== 1) {
        return;
    }
    createOrchestrateStopComment(decision);
}
function commentOnPlannerClarificationStop(decision) {
    if (!formatPlannerClarificationComment(decision) && !formatPlannerAnswerComment(decision)) {
        return;
    }
    createOrchestrateStopComment(decision);
}
function commentOnDelegationFailure(decision) {
    if (normalizeToken(sourceAction) !== "orchestrate") {
        return;
    }
    createOrchestrateStopComment(decision);
}
function commentOnUnsatisfactoryActionStop(decision) {
    if (formatPlannerClarificationComment(decision)) {
        return;
    }
    const normalizedSourceAction = normalizeToken(sourceAction);
    if (normalizedSourceAction !== "implement" && normalizedSourceAction !== "fix_pr") {
        return;
    }
    if (!UNSATISFACTORY_ACTION_CONCLUSIONS.has(normalizeToken(sourceConclusion))) {
        return;
    }
    createOrchestrateStopComment(decision);
}
function commentOnTerminalMetaOrchestratorStop(decision) {
    if (decision.decision !== "stop") {
        return;
    }
    if (formatPlannerClarificationComment(decision) || formatPlannerAnswerComment(decision)) {
        return;
    }
    if (normalizeToken(sourceAction) !== "orchestrate" ||
        automationMode !== "agent" ||
        normalizeToken(sourceTargetKind) !== "issue") {
        return;
    }
    if (currentRound === 1 && normalizeToken(sourceConclusion) === "requested") {
        return;
    }
    createOrchestrateStopComment(decision);
}
function decideManualOrchestration() {
    const nextRound = currentRound + 1;
    if (currentRound >= maxRounds) {
        return { decision: "stop", reason: "automation round budget exhausted", nextRound };
    }
    const normalizedKind = normalizeToken(sourceTargetKind);
    if (normalizedKind === "issue") {
        return {
            decision: "dispatch",
            nextAction: "implement",
            targetNumber,
            reason: "manual orchestrate start on issue; dispatching implement",
            nextRound,
        };
    }
    if (normalizedKind === "pull_request") {
        const status = readPrStatus(repo, targetNumber);
        if (!status) {
            return { decision: "stop", reason: "could not read pull request status", nextRound };
        }
        if (status.state !== "OPEN") {
            return { decision: "stop", reason: `pull request is ${status.state.toLowerCase()}`, nextRound };
        }
        if (status.reviewDecision === "CHANGES_REQUESTED") {
            return {
                decision: "dispatch",
                nextAction: "fix-pr",
                targetNumber,
                reason: "manual orchestrate start on PR with CHANGES_REQUESTED; dispatching fix-pr",
                nextRound,
            };
        }
        return {
            decision: "dispatch",
            nextAction: "review",
            targetNumber,
            reason: "manual orchestrate start on PR; dispatching review",
            nextRound,
        };
    }
    return { decision: "stop", reason: `unsupported target kind ${sourceTargetKind || "missing"}`, nextRound };
}
function decidePlannerOrchestration() {
    const nextRound = currentRound + 1;
    const normalizedKind = normalizeToken(sourceTargetKind);
    if (normalizedKind === "pull_request") {
        const status = readPrStatus(repo, targetNumber);
        if (!status) {
            return { decision: "stop", reason: "could not read pull request status", nextRound };
        }
        if (status.state !== "OPEN") {
            return { decision: "stop", reason: `pull request is ${status.state.toLowerCase()}`, nextRound };
        }
    }
    return (0, handoff_js_1.decideHandoff)({
        automationMode,
        sourceAction,
        sourceConclusion,
        sourceRecommendedNextStep,
        targetKind: sourceTargetKind,
        targetNumber,
        nextTargetNumber: process.env.NEXT_TARGET_NUMBER || "",
        currentRound,
        maxRounds,
        allowSelfApprove,
        allowSelfMerge,
        sourceHandoffContext,
        plannerDecision: readPlannerDecision(),
    });
}
function validateInitialOrchestrateCapabilities() {
    const reason = (0, orchestrator_capabilities_js_1.initialOrchestrateCapabilityStopReason)({
        sourceAction,
        sourceConclusion,
        currentRound,
        allowSelfApprove,
        allowSelfMerge,
        authorAssociation: sourceAssociationRaw,
        accessPolicy: accessPolicyRaw,
        isPublicRepo,
    });
    return reason ? { decision: "stop", reason, nextRound: currentRound + 1 } : null;
}
const authorizationStop = validateInitialOrchestrateCapabilities();
const routeDecision = authorizationStop || (normalizeToken(sourceAction) === "orchestrate"
    ? automationMode === "agent" &&
        ["issue", "pull_request"].includes(normalizeToken(sourceTargetKind))
        ? decidePlannerOrchestration()
        : decideManualOrchestration()
    : (0, handoff_js_1.decideHandoff)({
        automationMode,
        sourceAction,
        sourceConclusion,
        sourceRecommendedNextStep,
        targetKind: sourceTargetKind,
        targetNumber,
        nextTargetNumber: process.env.NEXT_TARGET_NUMBER || "",
        currentRound,
        maxRounds,
        allowSelfApprove,
        allowSelfMerge,
        sourceHandoffContext,
        plannerDecision: automationMode === "agent" ? readPlannerDecision() : null,
    }));
const decision = routeDecision;
if (decision.decision === "dispatch" && decision.nextAction === "fix-pr" && !decision.handoffContext) {
    decision.handoffContext = fallbackFixPrHandoffContext();
}
(0, output_js_1.setOutput)("decision", decision.decision);
(0, output_js_1.setOutput)("next_action", decision.decision === "delegate_issue" ? "delegate_issue" : decision.nextAction || "");
(0, output_js_1.setOutput)("target_number", decision.targetNumber || "");
(0, output_js_1.setOutput)("reason", decision.reason);
(0, output_js_1.setOutput)("next_round", String(decision.nextRound));
(0, output_js_1.setOutput)("handoff_context", decision.handoffContext || "");
(0, output_js_1.setOutput)("deduped", "false");
(0, output_js_1.setOutput)("dedupe_key", "");
(0, output_js_1.setOutput)("marker_comment_id", "");
if (decision.decision !== "dispatch" && decision.decision !== "delegate_issue") {
    console.log(`Handoff ${decision.decision}: ${decision.reason}`);
    try {
        commentOnPlannerClarificationStop(decision);
        commentOnInitialOrchestrateStop(decision);
        commentOnUnsatisfactoryActionStop(decision);
        reportTerminalToParent(decision);
        commentOnTerminalMetaOrchestratorStop(decision);
    }
    catch (err) {
        console.warn(`Failed to report terminal sub-orchestration state: ${errorText(err)}`);
    }
    process.exit(0);
}
if (!repo || !ref || (!decision.nextAction && decision.decision !== "delegate_issue") || !decision.targetNumber) {
    console.error("Missing required dispatch context for handoff");
    process.exit(2);
}
let dispatchTargetNumber = decision.targetNumber;
const dispatchName = decision.decision === "delegate_issue" ? "delegate_issue" : decision.nextAction || "";
if (decision.decision === "delegate_issue") {
    try {
        dispatchTargetNumber = ensureSubOrchestrationIssue(decision);
        decision.targetNumber = dispatchTargetNumber;
        (0, output_js_1.setOutput)("target_number", dispatchTargetNumber);
    }
    catch (err) {
        const message = `child issue delegation failed: ${errorText(err).slice(0, 1000)}`;
        const stopDecision = {
            decision: "stop",
            reason: message,
            nextRound: decision.nextRound,
            targetNumber,
        };
        (0, output_js_1.setOutput)("decision", "stop");
        (0, output_js_1.setOutput)("next_action", "");
        (0, output_js_1.setOutput)("target_number", targetNumber);
        (0, output_js_1.setOutput)("reason", message);
        console.error(message);
        try {
            commentOnDelegationFailure(stopDecision);
        }
        catch (commentErr) {
            console.warn(`Failed to report child issue delegation failure: ${errorText(commentErr)}`);
        }
        process.exit(0);
    }
}
const { baseBranch: effectiveBaseBranch, basePr: effectiveBasePr } = resolveEffectiveBaseInputs(decision);
if (decision.nextAction === "implement" && effectiveBaseBranch && effectiveBasePr) {
    const message = "set only one of base_branch or base_pr for implementation";
    const stopDecision = {
        decision: "stop",
        reason: message,
        nextRound: decision.nextRound,
        targetNumber: decision.targetNumber,
    };
    (0, output_js_1.setOutput)("decision", "stop");
    (0, output_js_1.setOutput)("next_action", "");
    (0, output_js_1.setOutput)("target_number", decision.targetNumber || "");
    (0, output_js_1.setOutput)("reason", message);
    console.error(message);
    try {
        commentOnInitialOrchestrateStop(stopDecision);
    }
    catch (err) {
        console.warn(`Failed to report implementation base input conflict: ${errorText(err)}`);
    }
    process.exit(0);
}
const dedupeKey = (0, handoff_js_1.buildHandoffDedupeKey)({
    repo,
    sourceRunId,
    sourceAction,
    sourceTargetNumber: targetNumber,
    nextAction: dispatchName,
    nextTargetNumber: dispatchTargetNumber,
    nextRound: decision.nextRound,
});
(0, output_js_1.setOutput)("dedupe_key", dedupeKey);
const markerTargetNumber = parsePositiveTargetNumber(dispatchTargetNumber);
if (!markerTargetNumber) {
    console.error(`Invalid handoff marker target number: ${decision.targetNumber}`);
    process.exit(2);
}
const existingMarkers = findHandoffMarkers(repo, markerTargetNumber, dedupeKey);
const nowMs = Date.now();
const activeMarker = existingMarkers.find((marker) => (marker.state === "dispatched" ||
    (marker.state === "pending" && !(0, handoff_js_1.isPendingHandoffMarkerStale)(marker, nowMs, PENDING_MARKER_TTL_MS))));
if (activeMarker) {
    (0, output_js_1.setOutput)("deduped", "true");
    (0, output_js_1.setOutput)("marker_comment_id", activeMarker.id);
    console.log(`Skipping duplicate handoff ${dedupeKey} (${activeMarker.state})`);
    process.exit(0);
}
for (const staleMarker of existingMarkers.filter((marker) => (0, handoff_js_1.isPendingHandoffMarkerStale)(marker, nowMs, PENDING_MARKER_TTL_MS))) {
    try {
        updateIssueComment(repo, staleMarker.id, (0, handoff_js_1.formatHandoffMarkerComment)({
            key: dedupeKey,
            state: "failed",
            sourceAction,
            nextAction: dispatchName,
            targetKind: decision.nextAction === "implement" || decision.decision === "delegate_issue" ? "issue" : "pull_request",
            targetNumber: dispatchTargetNumber,
            nextRound: decision.nextRound,
            maxRounds,
            reason: decision.reason,
            handoffContext: decision.handoffContext,
            error: "Pending handoff marker expired before dispatch completed; retrying handoff.",
        }));
    }
    catch (err) {
        console.warn(`Failed to expire stale pending handoff marker ${staleMarker.id}: ${errorText(err)}`);
    }
}
const pendingBody = (0, handoff_js_1.formatHandoffMarkerComment)({
    key: dedupeKey,
    state: "pending",
    sourceAction,
    nextAction: dispatchName,
    targetKind: decision.nextAction === "implement" || decision.decision === "delegate_issue" ? "issue" : "pull_request",
    targetNumber: dispatchTargetNumber,
    nextRound: decision.nextRound,
    maxRounds,
    reason: decision.reason,
    handoffContext: decision.handoffContext,
    createdAtMs: nowMs,
});
const markerCommentId = createIssueComment(repo, markerTargetNumber, pendingBody);
(0, output_js_1.setOutput)("marker_comment_id", markerCommentId);
const commonInputs = {
    requested_by: requestedBy,
    request_text: requestText,
    orchestration_enabled: "true",
    automation_mode: automationMode === "disabled" ? "heuristics" : automationMode,
    automation_current_round: String(decision.nextRound),
    automation_max_rounds: String(maxRounds),
    session_bundle_mode: sessionBundleMode,
};
try {
    if (decision.nextAction === "review") {
        (0, github_js_1.dispatchWorkflow)(repo, "agent-review.yml", ref, {
            ...commonInputs,
            pr_number: decision.targetNumber,
        });
    }
    else if (decision.nextAction === "agent-self-approve") {
        (0, github_js_1.dispatchWorkflow)(repo, "agent-self-approve.yml", ref, {
            ...commonInputs,
            pr_number: decision.targetNumber,
            source_conclusion: sourceConclusion,
            source_recommended_next_step: sourceRecommendedNextStep,
        });
    }
    else if (decision.nextAction === "agent-self-merge") {
        (0, github_js_1.dispatchWorkflow)(repo, "agent-self-merge.yml", ref, {
            ...commonInputs,
            pr_number: decision.targetNumber,
        });
    }
    else if (decision.nextAction === "implement") {
        (0, github_js_1.dispatchWorkflow)(repo, "agent-implement.yml", ref, {
            ...commonInputs,
            issue_number: decision.targetNumber,
            approval_comment_url: "",
            base_branch: effectiveBaseBranch,
            base_pr: effectiveBasePr,
            implementation_route: "implement",
            implementation_prompt: "implement",
        });
    }
    else if (decision.nextAction === "fix-pr") {
        (0, github_js_1.dispatchWorkflow)(repo, "agent-fix-pr.yml", ref, {
            ...commonInputs,
            pr_number: decision.targetNumber,
            request_source_kind: "workflow_dispatch",
            orchestrator_context: decision.handoffContext || "",
        });
    }
    else if (decision.decision === "delegate_issue") {
        (0, github_js_1.dispatchWorkflow)(repo, "agent-orchestrator.yml", ref, {
            requested_by: requestedBy,
            request_text: requestText,
            automation_max_rounds: String(maxRounds),
            session_bundle_mode: sessionBundleMode,
            source_action: "orchestrate",
            source_conclusion: "delegated",
            source_run_id: sourceRunId,
            target_kind: "issue",
            target_number: dispatchTargetNumber,
            automation_mode: "heuristics",
            automation_current_round: "1",
            base_branch: effectiveBaseBranch,
            base_pr: effectiveBasePr,
        });
    }
    else {
        console.error(`Unsupported next action: ${decision.nextAction}`);
        process.exit(2);
    }
}
catch (err) {
    const message = errorText(err).slice(0, 1000);
    try {
        updateIssueComment(repo, markerCommentId, (0, handoff_js_1.formatHandoffMarkerComment)({
            key: dedupeKey,
            state: "failed",
            sourceAction,
            nextAction: dispatchName,
            targetKind: decision.nextAction === "implement" || decision.decision === "delegate_issue" ? "issue" : "pull_request",
            targetNumber: dispatchTargetNumber,
            nextRound: decision.nextRound,
            maxRounds,
            reason: decision.reason,
            handoffContext: decision.handoffContext,
            error: message,
        }));
    }
    catch (updateErr) {
        console.warn(`Failed to mark handoff ${dedupeKey} as failed: ${errorText(updateErr)}`);
    }
    throw err;
}
const dispatchedBody = (0, handoff_js_1.formatHandoffMarkerComment)({
    key: dedupeKey,
    state: "dispatched",
    sourceAction,
    nextAction: dispatchName,
    targetKind: decision.nextAction === "implement" || decision.decision === "delegate_issue" ? "issue" : "pull_request",
    targetNumber: dispatchTargetNumber,
    nextRound: decision.nextRound,
    maxRounds,
    reason: decision.reason,
    handoffContext: decision.handoffContext,
    createdAtMs: nowMs,
});
try {
    updateIssueComment(repo, markerCommentId, dispatchedBody);
}
catch (err) {
    console.warn(`Handoff dispatched but marker ${markerCommentId} remained pending: ${errorText(err)}`);
}
if (collapseOldReviews) {
    try {
        const collapsed = (0, review_summary_minimize_js_1.collapsePreviousHandoffComments)({
            repo,
            targetNumber: markerTargetNumber,
            targetKind: decision.nextAction === "implement" || decision.decision === "delegate_issue" ? "issue" : "pull_request",
            excludeCommentId: markerCommentId,
            currentCreatedAtMs: nowMs,
        });
        if (collapsed > 0) {
            console.log(`Collapsed ${collapsed} previous orchestrator handoff comment(s).`);
        }
    }
    catch (err) {
        console.warn(`Failed to collapse previous orchestrator handoff comments for ${repo}#${markerTargetNumber}: ${errorText(err)}`);
    }
}
console.log(`Handoff dispatched ${dispatchName} for #${decision.targetNumber}: ${decision.reason}`);
//# sourceMappingURL=orchestrate-handoff.js.map