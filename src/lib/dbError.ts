type SupabaseErrorLike = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
};

function getErrorText(error: unknown) {
  if (!error || typeof error !== 'object') {
    return error instanceof Error ? error.message : String(error ?? '');
  }

  const errorLike = error as SupabaseErrorLike;
  return [errorLike.message, errorLike.details, errorLike.hint, errorLike.code]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
}

export function isMissingColumnError(error: unknown): boolean {
  const errorLike = error && typeof error === 'object' ? (error as SupabaseErrorLike) : {};
  const code = typeof errorLike.code === 'string' ? errorLike.code : '';
  const errorText = getErrorText(error);

  return code === '42703'
    || code === 'PGRST204'
    || errorText.includes('column does not exist')
    || errorText.includes('could not find the column')
    || errorText.includes('schema cache')
    || errorText.includes('does not exist in the schema cache')
    || errorText.includes('foreign key relationship')
    || errorText.includes('could not find a relationship')
    || errorText.includes('no relationship found')
    || (errorText.includes('relationship') && errorText.includes('schema cache'))
    || (errorText.includes('relationship') && errorText.includes('reports_target_chat_room_id_fkey'));
}

export function isSchemaRelationshipError(error: unknown): boolean {
  const errorText = getErrorText(error);
  return isMissingColumnError(error)
    || errorText.includes('foreign key relationship')
    || errorText.includes('could not find a relationship')
    || errorText.includes('no relationship found')
    || (errorText.includes('relationship') && errorText.includes('schema cache'));
}
