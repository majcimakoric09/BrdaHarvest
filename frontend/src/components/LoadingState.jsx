function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center py-16 text-brda-forest/60">
      <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-brda-vine border-t-transparent" />
      {label}
    </div>
  )
}

export default LoadingState
