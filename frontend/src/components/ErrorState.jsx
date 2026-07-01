function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="rounded-xl border border-brda-burgundy/30 bg-brda-burgundy/5 px-5 py-4 text-sm text-brda-burgundy">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-brda-burgundy/40 bg-white px-3 py-1.5 text-xs font-medium text-brda-burgundy transition-colors hover:bg-brda-burgundy/10"
        >
          Retry
        </button>
      )}
    </div>
  )
}

export default ErrorState
