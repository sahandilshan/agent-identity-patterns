# Agent Identity Patterns: Agent Instructions

This repository holds Sahan's agent identity patterns site. Sahan leads Agent Identity and AI capabilities for ThunderID. The site explains how to build agent solutions properly, for developers and enterprises, with ThunderID as the implementation. It will be published from Sahan's personal GitHub account with GitHub Pages.

## Start of every session

1. Read [docs/context/decisions.md](docs/context/decisions.md) for what is settled and what is open.
2. Read [docs/plan/site-structure.md](docs/plan/site-structure.md) for the site plan.
3. Read [docs/context/concept.md](docs/context/concept.md) and [docs/context/wayfinder-demo.md](docs/context/wayfinder-demo.md) when the work touches content or the demo.

## Principles

- **Standalone.** The site carries its own problem and solution story. Do not depend on, or reproduce, the ThunderID docs.
- **Problem first.** Each page starts with a failure an agent builder recognises, then the pattern, then the proof.
- **Honest status.** Every ThunderID capability claim is labelled Supported, Partial or Planned. Verify each one against the code of the release the site targets, and record the commit.
- **Identity scope only.** The site covers agent identity and authorization, not orchestration, memory or evals.
- **Show correct practice.** Demos and snippets must validate tokens properly (signature, issuer, audience, expiry, scope), even where a sample shortcut exists.

## Working with Sahan

- Challenge ideas with reasoned counter-arguments instead of agreeing by default. Separate verified facts, proposals, decisions and open questions.
- Propose before implementing. Do not create site code, scaffolding or tooling unless Sahan asks for it.
- Ask before creating the GitHub remote, pushing, publishing Pages, or posting anywhere. Commit only when asked. Commits use `git commit -s` (Signed-off-by: Sahan Dilshan) with no AI co-author trailer.
- Record decisions and open questions in `docs/context/decisions.md` before ending a substantive session.

## Public content rules

The site and this repository are public. Do not add WSO2-internal material: internal decks, customer or CS session content, product comparisons with WSO2 Identity Server, analyst reports, or internal tracking. Do not cite internal sessions, whiteboards or local branches. Do not use em dashes, or `--` as a substitute, in published content.

## ThunderID sources for verification

- Upstream code: `thunder-id/thunderid` on GitHub. Use `gh` with `-R thunder-id/thunderid`.
- A read-only mirror of upstream main: `/Users/sahandilshan/IAM/thunder-developments/thunder-discussions/thunderid`. It is reset automatically; never keep work there.
- Sahan's development checkout: `/Users/sahandilshan/IAM/thunder-developments/thunder`. Never switch or reset its branch.
- Wayfinder sample: `samples/apps/wayfinder-sample`. Python Concierge: thunder-id/thunderid#5884.
- To run ThunderID for recording traces, follow `/Users/sahandilshan/IAM/thunder-developments/thunder-discussions/docs/local-runtime-repro.md`: use a detached worktree on another port, and never use Sahan's branch or his `8090` server.
- Sahan's ThunderID research workspace, with AgentID guidelines and memory: `/Users/sahandilshan/IAM/thunder-developments/thunder-discussions`. Its `guidelines/` folder holds dated product evidence; treat it as routing hints and verify against code.
