/**
 * Utility to transform Terraform plan JSON into human-readable resource information.
 * Does NOT modify plan data; generates UI-layer summaries and descriptions.
 */

export function extractResourceSummary(selectedChange: any) {
  if (!selectedChange) return null
  const address = selectedChange.address || ''
  const parts = address.split('.')
  const resourceType = parts[0]
  const resourceName = parts[parts.length - 1]
  const moduleCtx = parts.length > 2 ? parts.slice(0, -1).join('.') : 'root'

  const actions = (selectedChange.change && selectedChange.change.actions) || []
  const action = actions.length > 0 ? actions[0] : 'no-op'

  const afterConfig = selectedChange.change && selectedChange.change.after

  return {
    address,
    resourceType,
    resourceName,
    moduleCtx,
    action,
    afterConfig,
  }
}

export function getCategoryLabel(key: string): string {
  // Map Terraform field names to human-readable category labels
  if (['ingress', 'egress'].includes(key)) return 'Rules'
  if (['tags', 'labels'].includes(key)) return 'Metadata'
  if (key.includes('rule')) return 'Rules'
  if (key.includes('listener')) return 'Listeners'
  if (key.includes('block_device')) return 'Storage'
  if (key.includes('zone')) return 'Availability'
  if (key.includes('security_group')) return 'Security'
  return 'Configuration'
}

export function isEditableField(key: string): boolean {
  // Fields that are typically user-editable (not computed/state-only)
  const computedPatterns = ['id', 'arn', 'available_', 'created_at', 'updated_at']
  const isComputed = computedPatterns.some((p) => key.toLowerCase().includes(p))
  return !isComputed && typeof key === 'string'
}

export function renderBlockValue(val: any): string {
  if (val === null || val === undefined) return '(empty)'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'string') return val.length > 60 ? val.substring(0, 60) + '...' : val
  if (Array.isArray(val)) return `[${val.length} items]`
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

export function describeIngressEgressRules(rules: any[]): string[] {
  if (!Array.isArray(rules)) return []
  return rules.map((r) => {
    const fromPort = r.from_port !== undefined ? r.from_port : 'all'
    const toPort = r.to_port !== undefined ? r.to_port : 'all'
    const proto = r.protocol || 'tcp'
    const cidr = r.cidr_blocks?.[0] || r.ipv6_cidr_blocks?.[0] || 'N/A'
    const isPublic = cidr === '0.0.0.0/0' ? '(public)' : ''
    return `${proto.toUpperCase()} port ${fromPort}${fromPort !== toPort ? `-${toPort}` : ''} from ${cidr} ${isPublic}`.trim()
  })
}

export function annotateRisks(resourceType: string, config: any): string[] {
  const risks: string[] = []
  if (!config) return risks

  // Security Group risks
  if (resourceType.includes('security_group')) {
    const egress = config.egress || []
    if (egress.some((e: any) => e.from_port === 0 && e.to_port === 65535)) {
      risks.push('Allows all outbound traffic')
    }
    const ingress = config.ingress || []
    if (ingress.some((i: any) => i.cidr_blocks?.includes('0.0.0.0/0'))) {
      risks.push('Publicly accessible on some ports')
    }
  }

  // Public access
  if (config.associate_public_ip_address === true) {
    risks.push('Publicly accessible')
  }

  // Wide CIDR
  if (typeof config.cidr_block === 'string' && config.cidr_block === '0.0.0.0/0') {
    risks.push('Wide CIDR range (0.0.0.0/0)')
  }

  return risks
}
