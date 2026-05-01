// ═══════════════════════════════════════════════════════════════
//  STANDARD SCANNER — Business Security Audit (150+ checks)
//  Full homepage analysis without spider/attack/infra
//  Accepts any email (no business email validation)
// ═══════════════════════════════════════════════════════════════

// Re-uses the existing deep scanner for single-page analysis
// The key difference: no spider, no attack engine, no infrastructure
import { performDeepScan, type DeepScanResult } from './scanner';

export type StandardScanResult = DeepScanResult;

export async function performStandardScan(targetUrl: string): Promise<StandardScanResult> {
  // Standard scan = deep scan of homepage only (same 150+ checks)
  // Spider, attack engine, and infrastructure are handled by the orchestrator tier logic
  return performDeepScan(targetUrl);
}
