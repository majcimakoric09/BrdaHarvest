import { useEffect } from 'react'
import { X } from 'lucide-react'

function Modal({ title, description, onClose, children }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brda-forest/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-brda-beige bg-white p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="font-display text-xl font-semibold text-brda-forest">{title}</h2>
            {description && <p className="mt-1 text-sm text-brda-forest/60">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-brda-forest/60 transition-colors hover:bg-brda-beige-light hover:text-brda-forest"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

export default Modal
