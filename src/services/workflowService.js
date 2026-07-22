const STATUSES = {
  draft: { label: 'Draft', next: ['review'] },
  review: { label: 'Under Review', next: ['approved', 'revision'] },
  approved: { label: 'Approved', next: ['published', 'archived'] },
  revision: { label: 'Revision Needed', next: ['review', 'archived'] },
  published: { label: 'Published', next: ['archived'] },
  archived: { label: 'Archived', next: ['draft'] },
};

export const workflowService = {
  getValidTransitions(currentStatus) {
    const entry = STATUSES[currentStatus];
    return entry ? entry.next.map((s) => ({ status: s, label: STATUSES[s].label })) : [];
  },

  canTransition(from, to) {
    const entry = STATUSES[from];
    return !!entry && entry.next.includes(to);
  },

  getLabel(status) {
    return STATUSES[status]?.label || status;
  },

  async transition({ id, collection, from, to, user, comment = '' }) {
    if (!this.canTransition(from, to)) {
      return { ok: false, error: `Cannot transition from "${from}" to "${to}"` };
    }
    try {
      const { auditService } = await import('@/services/auditService.js');
      const { default: repository } = await import(`@/data-layer/repositories/${collection}Repository.js`);
      await repository.update(id, { status: to });
      await auditService.record({
        action: `${collection}.status`,
        module: collection,
        user,
        details: `Status: ${from} → ${to}${comment ? ` (${comment})` : ''}`,
      });
      return { ok: true, data: { from, to } };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
};
