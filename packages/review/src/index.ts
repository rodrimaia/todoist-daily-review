/**
 * Shared Review package entry point.
 *
 * Behavior is extracted from the Web client in issues #37 and #38. Keeping a
 * stable package boundary now lets both clients depend on the same seam while
 * the migration remains incremental.
 */
export type ReviewClientKind = 'web' | 'terminal'
