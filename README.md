# Make Headless Automation

Talk package showing Make as the enterprise automation interface for teams, internal apps, developers, and AI agents.

Run Make from the terminal so teams, developers, internal apps, and AI agents can build and deploy automations in one flow.

## Simple Diagrams

Use the JPEG files directly in slides or docs. Open the Excalidraw files when you need to edit the diagrams.

| Visual | JPEG | Editable Excalidraw | Purpose |
| --- | --- | --- | --- |
| Enterprise automation layer | [JPEG](docs/diagrams/enterprise-automation-layer.jpg) | [Excalidraw](docs/diagrams/enterprise-automation-layer.excalidraw) | Humans, agents, apps, and developers call Make instead of connecting every system directly. |
| Reusable API shell pattern | [JPEG](docs/diagrams/api-shell-pattern.jpg) | [Excalidraw](docs/diagrams/api-shell-pattern.excalidraw) | Shows the API-shell flow: Scenario Inputs -> app API-call module -> output is returned. |
| One contract, many interfaces | [JPEG](docs/diagrams/one-contract-many-interfaces.jpg) | [Excalidraw](docs/diagrams/one-contract-many-interfaces.excalidraw) | Portal, Slack/support UI, CLI, and AI agents use the same scenario contract. |
| Safety model | [JPEG](docs/diagrams/safety-model.jpg) | [Excalidraw](docs/diagrams/safety-model.excalidraw) | Make keeps credentials, policy, logs, retries, and evidence behind approved actions. |

## Core Problem

The core problem is not that developers need another CLI. The core problem is that companies are becoming networks of humans, agents, internal apps, SaaS tools, and AI-generated code, but most teams cannot safely connect all of that work themselves.

Some teams can use Claude Code, Codex, Cursor, or Vercel-style workflows. Many other teams cannot: they may not have the skillset, they may be blocked by compliance rules, or they may not be allowed to put raw SaaS credentials into AI-generated applications. Make becomes the shared communication and connector layer: approved scenarios expose controlled Scenario Inputs and Scenario Outputs, while Make handles SaaS connections, permissions, orchestration, logging, retries, and auditability.

Make CLI is the developer and AI-agent entry point. Make scenarios are the governed execution surface.

## Make as Enterprise API Management for AI-Generated Apps

A web-coded application should not need to hold every SaaS credential, reimplement every vendor API, or teach every AI agent how Stripe, Google Sheets, CRM, ticketing, finance, Slack, and Teams all work. Instead, the app sends typed business intent to Make:

```bash
make-cli scenarios interface <scenario-id>
make-cli scenarios run <scenario-id> --data='{"businessInput":"value"}' --responsive
```

The scenario interface is the contract. The web app, coding agent, or CI job provides the input shape Make expects; Make executes the approved business process and returns typed outputs such as created record IDs, approval status, escalation links, next actions, and `executionId`.

This matters because non-technical users do not need to use the CLI directly. They can use a portal, form, Slack app, support console, finance tool, or AI-generated internal app. Developers and AI coding agents use Make CLI to inspect, test, deploy, and call the same approved workflows behind the scenes.

## Make Skills, API Shells, and Connections

The API-shell and connection-retrieval workflow is the provisioning layer for exposing SaaS capabilities safely through Make. A reusable shell scenario can wrap one app-specific API-call module behind Scenario Inputs and Scenario Outputs. The shell receives a narrow request, uses the approved Make connection, and returns the provider response body without exposing raw OAuth secrets or asking the app developer to implement the vendor API.

Use that pattern when the business process needs to retrieve or write SaaS data that is not already represented by a standard approved scenario. The API shell is not the whole enterprise layer; it is the controlled transport primitive underneath it. The business layer still stays in approved scenarios, typed inputs/outputs, policy gates, logs, retries, and evidence.

The public Make skill package in [integromat/make-skills#15](https://github.com/integromat/make-skills/pull/15) fits this story: it teaches agents to discover the exact Make app/API-call module, reuse or request the right connection, create or reuse the shell safely, explicitly set the scenario interface, and run retrieval through the shell contract.

Use Make CLI as the operational surface for developers and coding agents, and keep the approved scenario or API shell as the compliance boundary for live SaaS access.

See [docs/talk.md](docs/talk.md) for the English talk track.

## Demos

| Workflow | Business trigger | Live scenario env var |
| --- | --- | --- |
| `inbound-lead-qualification` | Product signup, website form, or partner lead webhook | `MAKE_LEAD_QUALIFICATION_SCENARIO_ID` |
| `customer-escalation-pack` | Support ticket crosses a severity or SLA threshold | `MAKE_CUSTOMER_ESCALATION_SCENARIO_ID` |
| `deal-desk-approval` | Quote or discount request from CRM or an internal app | `MAKE_DEAL_DESK_SCENARIO_ID` |
| `invoice-exception-resolution` | AP system flags an invoice mismatch | `MAKE_INVOICE_EXCEPTION_SCENARIO_ID` |

Each workflow has a fixture input in `examples/payloads/` and a sanitized expected output in `examples/outputs/`.

## Workflow Pattern

A developer or AI agent discovers the contract:

```bash
make-cli scenarios interface <scenario-id>
```

An internal app or agent sends business input:

```bash
make-cli scenarios run <scenario-id> \
  --data='{"opportunityId":"OPP-2026-0415","discountPercent":18}' \
  --responsive
```

Make returns auditable business output:

```json
{
  "executionId": "exec_...",
  "approvalStatus": "pending-approval",
  "approver": "deal-desk-manager",
  "policyFlags": ["discount_above_standard_band"]
}
```

The app shows the result to the user without exposing raw SaaS credentials or requiring that user to know the terminal.

## Quick Start

```bash
npm test
npm run list
node bin/headless-make.mjs demo deal-desk-approval
```

Fixture mode writes redacted evidence to `out/` and does not call Make.

## Live Setup

Copy `.env.example` to `.env` and set:

```bash
MAKE_API_KEY=...
MAKE_ZONE=us1.make.com
MAKE_DEAL_DESK_SCENARIO_ID=...
```

Install or expose Make CLI:

```bash
npm install -g @makehq/cli
make-cli whoami
```

If `make-cli` is not installed, this repo falls back to `npx --yes @makehq/cli` when `npx` is available.

## Commands

```bash
node bin/headless-make.mjs doctor
node bin/headless-make.mjs list-workflows
node bin/headless-make.mjs demo deal-desk-approval
node bin/headless-make.mjs demo deal-desk-approval --live
node bin/headless-make.mjs run 925 \
  --workflow deal-desk-approval \
  --data-file examples/payloads/deal-desk-approval.json
```

Live commands inspect the scenario interface before running:

```bash
make-cli scenarios interface 925
make-cli scenarios run 925 --data='{"opportunityId":"OPP-1"}' --responsive
make-cli executions get-detail <executionId> --scenario-id=925
```

## Smoke Examples

These examples show the same three-step shape for each business workflow: inspect the Scenario Inputs/Outputs, run the approved scenario, then keep the returned evidence.

```bash
# Inbound Lead Qualification
make-cli scenarios interface "$MAKE_LEAD_QUALIFICATION_SCENARIO_ID"
node bin/headless-make.mjs demo inbound-lead-qualification --live
cat out/inbound-lead-qualification.evidence.json

# Customer Escalation Pack
make-cli scenarios interface "$MAKE_CUSTOMER_ESCALATION_SCENARIO_ID"
node bin/headless-make.mjs demo customer-escalation-pack --live
cat out/customer-escalation-pack.evidence.json

# Deal Desk Approval
make-cli scenarios interface "$MAKE_DEAL_DESK_SCENARIO_ID"
node bin/headless-make.mjs demo deal-desk-approval --live
cat out/deal-desk-approval.evidence.json

# Invoice Exception Resolution
make-cli scenarios interface "$MAKE_INVOICE_EXCEPTION_SCENARIO_ID"
node bin/headless-make.mjs demo invoice-exception-resolution --live
cat out/invoice-exception-resolution.evidence.json
```

## Safety Model

- The repo does not create, update, activate, or delete scenarios by default.
- Fixture mode is the default for `demo`.
- Live writes only happen inside pre-approved Make scenarios.
- Generated evidence is written to `out/`, which is gitignored.
- Evidence is redacted for API keys, tokens, authorization headers, emails, UUIDs, and Make zone URLs.
- End users are not expected to run terminal commands directly; the CLI is for developers, AI coding agents, scripts, and CI/CD jobs.

## Direct API Fallback

Make CLI is the preferred talk path because agents and CI systems can call it from the terminal. If a runtime cannot use the CLI, the same execution pattern can call the Make API directly:

```bash
curl -X POST "https://$MAKE_ZONE/api/v2/scenarios/$SCENARIO_ID/run" \
  -H "Authorization: Token $MAKE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"data":{"key":"value"},"responsive":true}'
```

Use API tokens scoped for the specific approved scenarios and keep write scopes out of general-purpose agent environments.
