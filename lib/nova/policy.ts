import type { ActionRequest, NovaCapability, PermissionLevel, PolicyDecision } from "./domain.ts";

const SUGGEST_CAPABILITIES = new Set<NovaCapability>(["email.draft", "calendar.draft"]);
const WRITE_CAPABILITIES = new Set<NovaCapability>(["email.send", "calendar.write", "notifications.write"]);

export function requiredPermission(capability: NovaCapability): PermissionLevel {
  if (WRITE_CAPABILITIES.has(capability)) return "act";
  if (SUGGEST_CAPABILITIES.has(capability)) return "suggest";
  return "observe";
}

const permissionRank: Record<PermissionLevel, number> = { observe: 1, suggest: 2, act: 3 };

export function evaluateAction(request: ActionRequest): PolicyDecision {
  if (!request.account || request.account.status !== "active") {
    return { allowed: false, requiresApproval: false, reason: "Connect and authorize the source account first.", auditCode: "DENY_NO_CONNECTION" };
  }

  if (request.account.userId !== request.userId) {
    return { allowed: false, requiresApproval: false, reason: "This connected account belongs to a different NOVA user.", auditCode: "DENY_ACCOUNT_OWNERSHIP" };
  }

  if (!request.account.grantedCapabilities.includes(request.capability)) {
    return { allowed: false, requiresApproval: false, reason: "The connected account did not grant this capability.", auditCode: "DENY_SCOPE" };
  }

  const required = requiredPermission(request.capability);
  if (permissionRank[request.account.permissionLevel] < permissionRank[required]) {
    return { allowed: false, requiresApproval: false, reason: `This action requires ${required} permission.`, auditCode: "DENY_PERMISSION" };
  }

  if (WRITE_CAPABILITIES.has(request.capability) && !request.userApproved) {
    return { allowed: false, requiresApproval: true, reason: "NOVA prepared the action, but the user must approve it before execution.", auditCode: "DENY_APPROVAL_REQUIRED" };
  }

  return {
    allowed: true,
    requiresApproval: false,
    reason: WRITE_CAPABILITIES.has(request.capability) ? "The user approved this scoped action." : "The connected account permits this read or suggestion.",
    auditCode: WRITE_CAPABILITIES.has(request.capability) ? "ALLOW_APPROVED_ACTION" : "ALLOW_READ",
  };
}

export function canIndexContent(sensitivity: ActionRequest["sensitivity"], userOptedIntoRestrictedMemory: boolean) {
  void userOptedIntoRestrictedMemory;
  return sensitivity !== "restricted";
}
