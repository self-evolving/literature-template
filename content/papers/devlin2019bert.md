---
title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding"
type: paper
citekey: devlin2019bert
authors:
  - Jacob Devlin
  - Ming-Wei Chang
  - Kenton Lee
  - Kristina Toutanova
year: 2019
venue: NAACL-HLT
url: https://aclanthology.org/N19-1423/
doi: 10.18653/v1/N19-1423
status: example
tags:
  - paper
  - transformers
  - language-models
---

BERT adapts the Transformer encoder into a bidirectional pre-training framework for language understanding tasks.

## Summary

The paper introduces masked language modeling and next-sentence prediction as pre-training objectives, then fine-tunes the same model on a broad set of downstream NLP benchmarks.

## Key ideas

- Bidirectional encoder representations can condition on both left and right context.
- A small task-specific head can adapt a shared pre-trained model to many language-understanding tasks.
- Pre-training objectives shape what kinds of knowledge are convenient to transfer.

## Connections

- Builds on the Transformer architecture introduced in [Attention Is All You Need](./vaswani2017attention.md).
- Contrasts with [Language Models are Few-Shot Learners](./brown2020language.md), which emphasizes scale and prompting rather than task-specific fine-tuning.
