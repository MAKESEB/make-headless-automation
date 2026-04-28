# Talk Track: Make as the Enterprise Automation Interface

## Core Thesis

Salesforce is moving toward headless software: APIs, MCP tools, and CLI commands become the interface for agents. The important enterprise question is no longer only, "Which screen does a human click?" It is, "Which approved action can an app, agent, developer, or team safely trigger?"

The core problem is not that developers need another CLI. The core problem is that companies are becoming networks of humans, agents, internal apps, SaaS tools, and AI-generated code. Not every team can safely connect all of those systems directly.

Some teams can use Claude Code, Codex, Cursor, or Vercel-style workflows. Many other teams cannot because of skill gaps, legal constraints, security policy, compliance limits, or restrictions around putting raw SaaS credentials into AI-generated apps. Make becomes the shared communication and connector layer.

Option C is the story: Run Make from the terminal, so your team and your AI agents can build and deploy automations in one flow.

Make CLI is the entry point for developers and coding agents. Make scenarios are the governed execution layer.

## Make as Enterprise API Management for Web-Coded Apps

A web-coded application should not need to implement every SaaS API itself, and it should not need to hold every credential for Stripe, Google Sheets, CRM, ticketing, finance, Slack, or Teams. The application should send business intent to Make:

```bash
make-cli scenarios interface <scenario-id>
make-cli scenarios run <scenario-id> --data='{"businessInput":"value"}' --responsive
```

Scenario Inputs and Scenario Outputs are the contract between code and business automation. The app, agent, or CI job provides the input. Make executes the approved process and returns structured outputs: record IDs, approval status, escalation links, next steps, and `executionId`.

That is enterprise API management in practical form. A new app does not receive broad direct authority over every target system. It calls a controlled, auditable Make process.

## Make Skills, API Shells, and Connection Retrieval

API-shell and connection-retrieval workflows are the foundation for exposing SaaS capabilities safely through Make. A reusable shell scenario can wrap an app-specific API-call module behind Scenario Inputs and Scenario Outputs. The shell receives a narrow request, uses the approved Make connection, and returns normalized data.

This matters for apps and agents because they do not need to know how OAuth, token refresh, vendor endpoints, or app-specific errors work. Make CLI is the operational surface for developers and agents. The approved scenario or API shell is the compliance boundary for live SaaS access.

## Demo Pattern

Not this: an agent clicks through CRM, support, Slack, finance, and spreadsheet UIs.

Not this either: an AI-generated web app stores every SaaS credential and implements every vendor API by itself.

Instead, an app or agent calls an approved workflow:

```bash
make-cli scenarios interface <scenario-id>
make-cli scenarios run <scenario-id> \
  --data='{"opportunityId":"OPP-2026-0415","discountPercent":18}' \
  --responsive
```

Then there is an execution record, structured output, and optional execution detail:

```bash
make-cli executions get-detail <execution-id> --scenario-id=<scenario-id>
```

The end user only sees the result in a portal, Slack, a support tool, or an internal UI. The CLI is for developers, agents, scripts, and CI/CD jobs.

## Demo 1: Inbound Lead Qualification

Business moment: a web app captures a signup or partner lead. The app or agent should not guess CRM rules.

Input:

- `leadEmail`
- `companyName`
- `website`
- `source`
- `notes`

Make workflow:

- Enrich the lead
- Deduplicate CRM records
- Create or update the CRM lead
- Assign an owner
- Post a sales alert

Output:

- `crmLeadId`
- `score`
- `owner`
- `nextStep`
- `executionId`

Talk line: "The app provides context. Make runs the approved revenue process."

## Demo 2: Customer Escalation Pack

Business moment: a support portal or customer-health system detects a severe issue.

Input:

- `ticketId`
- `accountName`
- `severity`
- `summary`
- `requestedBy`

Make workflow:

- Update the ticket
- Fetch account context
- Create an escalation task or channel
- Notify the owner

Output:

- `escalationId`
- `owner`
- `slaDeadline`
- `channelUrl`
- `executionId`

Talk line: "This is not a personal productivity demo. This is a reliable company process that an app or agent is allowed to trigger."

## Demo 3: Deal Desk Approval

Business moment: a sales system or AI-generated quote tool requests discount approval.

Input:

- `opportunityId`
- `discountPercent`
- `arr`
- `closeDate`
- `justification`

Make workflow:

- Validate policy
- Route approval
- Update CRM
- Notify the approver

Output:

- `approvalStatus`
- `approver`
- `crmUpdateId`
- `policyFlags`
- `executionId`

Talk line: "Code can trigger the process, but Make remains the controlled execution layer."

## Demo 4: Invoice Exception Resolution

Business moment: a finance app finds a mismatch between an invoice and a purchase order.

Input:

- `invoiceId`
- `vendorName`
- `amount`
- `poNumber`
- `exceptionReason`

Make workflow:

- Compare invoice and purchase order records
- Create an approval task
- Notify the finance owner
- Write an audit trail

Output:

- `resolutionStatus`
- `approver`
- `taskId`
- `auditRecordId`
- `executionId`

Talk line: "Agentic does not mean uncontrolled. The agent starts an approved process; Make provides the audit trail."

## Close

Headless SaaS does not mean there is no UI. It means the UI is no longer the only way to get business work done.

For developers and agents, the best interface is often a CLI command with clear inputs and outputs. For everyone else, it may be a portal, form, chat, support tool, or internal UI. Make connects both sides: teams work in their chosen interface while Make remains the approved automation and API-management layer behind it.
