---
title: "Language Models are Few-Shot Learners"
type: paper
citekey: brown2020language
authors:
  - Tom B. Brown
  - Benjamin Mann
  - Nick Ryder
  - Melanie Subbiah
year: 2020
venue: NeurIPS
url: https://arxiv.org/abs/2005.14165
doi:
status: example
tags:
  - paper
  - language-models
  - few-shot-learning
---

GPT-3 shows that large autoregressive language models can perform many tasks from natural-language instructions and a few examples in the prompt.

## Summary

The paper scales decoder-only language models and evaluates zero-shot, one-shot, and few-shot prompting across a wide range of tasks.

## Key ideas

- Prompting can replace some task-specific fine-tuning workflows.
- Scale changes the practical interface to language models by making in-context examples more useful.
- Few-shot evaluation foregrounds deployment-time interaction patterns, not only benchmark fine-tuning.

## Connections

- Uses the Transformer lineage introduced by [Attention Is All You Need](./vaswani2017attention.md).
- Provides a useful contrast to [BERT](./devlin2019bert.md): decoder-only prompting versus encoder-only fine-tuning.
