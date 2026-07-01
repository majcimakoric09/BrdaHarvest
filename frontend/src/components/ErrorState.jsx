function ErrorState({ message = 'Something went wrong.' }) {
  return (
    <div className="rounded-xl border border-brda-burgundy/30 bg-brda-burgundy/5 px-5 py-4 text-sm text-brda-burgundy">
      {message}
    </div>
  )
}

export default ErrorState
