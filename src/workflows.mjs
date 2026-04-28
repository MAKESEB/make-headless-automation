export const workflows = [
  {
    id: "inbound-lead-qualification",
    aliases: ["lead", "lead-qualification", "inbound-lead"],
    title: "Inbound Lead Qualification",
    scenarioEnvVar: "MAKE_LEAD_QUALIFICATION_SCENARIO_ID",
    payloadFile: "examples/payloads/inbound-lead-qualification.json",
    outputFile: "examples/outputs/inbound-lead-qualification.json",
    trigger: "Product signup, website form, or partner lead webhook.",
    inputKeys: ["leadEmail", "companyName", "website", "source", "notes"],
    outputKeys: ["crmLeadId", "score", "owner", "nextStep", "executionId"],
    approvedWrites: [
      "Enrich and deduplicate the lead",
      "Create or update the CRM lead",
      "Assign an owner",
      "Post a sales alert"
    ]
  },
  {
    id: "customer-escalation-pack",
    aliases: ["customer-escalation", "escalation", "support"],
    title: "Customer Escalation Pack",
    scenarioEnvVar: "MAKE_CUSTOMER_ESCALATION_SCENARIO_ID",
    payloadFile: "examples/payloads/customer-escalation-pack.json",
    outputFile: "examples/outputs/customer-escalation-pack.json",
    trigger: "Support ticket crosses a severity or SLA threshold.",
    inputKeys: ["ticketId", "accountName", "severity", "summary", "requestedBy"],
    outputKeys: ["escalationId", "owner", "slaDeadline", "channelUrl", "executionId"],
    approvedWrites: [
      "Update the support ticket",
      "Fetch account context",
      "Create an escalation task or channel",
      "Notify the account owner"
    ]
  },
  {
    id: "deal-desk-approval",
    aliases: ["deal-desk", "approval", "quote"],
    title: "Deal Desk Approval",
    scenarioEnvVar: "MAKE_DEAL_DESK_SCENARIO_ID",
    payloadFile: "examples/payloads/deal-desk-approval.json",
    outputFile: "examples/outputs/deal-desk-approval.json",
    trigger: "Quote or discount request from CRM or an internal app.",
    inputKeys: ["opportunityId", "discountPercent", "arr", "closeDate", "justification"],
    outputKeys: ["approvalStatus", "approver", "crmUpdateId", "policyFlags", "executionId"],
    approvedWrites: [
      "Validate discount policy",
      "Route approval",
      "Update CRM stage or fields",
      "Notify the approver"
    ]
  },
  {
    id: "invoice-exception-resolution",
    aliases: ["invoice-exception", "invoice", "ap"],
    title: "Invoice Exception Resolution",
    scenarioEnvVar: "MAKE_INVOICE_EXCEPTION_SCENARIO_ID",
    payloadFile: "examples/payloads/invoice-exception-resolution.json",
    outputFile: "examples/outputs/invoice-exception-resolution.json",
    trigger: "AP system flags an invoice mismatch.",
    inputKeys: ["invoiceId", "vendorName", "amount", "poNumber", "exceptionReason"],
    outputKeys: ["resolutionStatus", "approver", "taskId", "auditRecordId", "executionId"],
    approvedWrites: [
      "Compare invoice and purchase order data",
      "Create an approval task",
      "Notify the finance owner",
      "Write an audit trail"
    ]
  }
];

export function findWorkflow(value) {
  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase();
  return workflows.find(
    (workflow) => workflow.id === normalized || workflow.aliases.includes(normalized)
  );
}

export function workflowChoices() {
  return workflows.map((workflow) => workflow.id).join(", ");
}
