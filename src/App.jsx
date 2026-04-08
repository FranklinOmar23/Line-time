import { useEffect, useMemo, useRef, useState } from 'react'
import songFile from './assets/Bruno Mars - Risk It All [Official Music Video].m4a'
import initialMemories from './data/memories.json'

const AUDIO_SOURCE = songFile
const AUDIO_START_SECONDS = 5
const MEMORIES_STORAGE_KEY = 'timeline-memories-v1'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const mixColor = (start, end, ratio) => {
  const progress = clamp(ratio, 0, 1)
  const r = Math.round(start[0] + (end[0] - start[0]) * progress)
  const g = Math.round(start[1] + (end[1] - start[1]) * progress)
  const b = Math.round(start[2] + (end[2] - start[2]) * progress)
  return `rgb(${r} ${g} ${b})`
}

function App() {
  const [memories, setMemories] = useState(() => {
    if (typeof window === 'undefined') {
      return initialMemories
    }

    try {
      const stored = window.localStorage.getItem(MEMORIES_STORAGE_KEY)
      if (!stored) {
        return initialMemories
      }

      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialMemories
    } catch {
      return initialMemories
    }
  })
  const [activeId, setActiveId] = useState(() =>
    initialMemories.length > 0 ? initialMemories[0].id : null,
  )
  const [showIntro, setShowIntro] = useState(true)
  const [audioReadyByClick, setAudioReadyByClick] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({ date: '', note: '', photo: '', alt: '' })
  const audioRef = useRef(null)

  const jumpToConfiguredStart = () => {
    if (!audioRef.current) {
      return
    }

    const audio = audioRef.current

    if (audio.readyState >= 1) {
      audio.currentTime = AUDIO_START_SECONDS
      return
    }

    const seekWhenReady = () => {
      audio.currentTime = AUDIO_START_SECONDS
    }

    audio.addEventListener('loadedmetadata', seekWhenReady, { once: true })
  }

  useEffect(() => {
    const onScroll = () => {
      const maxScroll =
        document.documentElement.scrollHeight - document.documentElement.clientHeight
      const nextProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0
      setScrollProgress(clamp(nextProgress, 0, 1))
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--scroll-progress',
      scrollProgress.toFixed(4),
    )
  }, [scrollProgress])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(memories))
  }, [memories])

  useEffect(() => {
    if (memories.length === 0) {
      setActiveId(null)
      return
    }

    const exists = memories.some((memory) => memory.id === activeId)
    if (!exists) {
      setActiveId(memories[0].id)
    }
  }, [memories, activeId])

  useEffect(() => {
    const syncPlayingState = () => {
      if (!audioRef.current) {
        return
      }

      setIsPlaying(!audioRef.current.paused)
    }

    const audioElement = audioRef.current
    if (!audioElement) {
      return undefined
    }

    audioElement.addEventListener('play', syncPlayingState)
    audioElement.addEventListener('pause', syncPlayingState)

    return () => {
      audioElement.removeEventListener('play', syncPlayingState)
      audioElement.removeEventListener('pause', syncPlayingState)
    }
  }, [])

  useEffect(() => {
    if (!audioReadyByClick || isPlaying || !audioRef.current) {
      return undefined
    }

    const unlockAndPlay = () => {
      jumpToConfiguredStart()

      audioRef.current
        .play()
        .then(() => {
          setAudioReadyByClick(false)
        })
        .catch(() => {
          setAudioReadyByClick(true)
        })
    }

    window.addEventListener('pointerdown', unlockAndPlay, { once: true })
    window.addEventListener('keydown', unlockAndPlay, { once: true })

    return () => {
      window.removeEventListener('pointerdown', unlockAndPlay)
      window.removeEventListener('keydown', unlockAndPlay)
    }
  }, [audioReadyByClick, isPlaying])

  const rememberButtonTone = useMemo(() => {
    const softRose = [252, 244, 247]
    const vividFuchsia = [233, 56, 143]
    return mixColor(softRose, vividFuchsia, scrollProgress)
  }, [scrollProgress])

  const startExperience = () => {
    setShowIntro(false)

    if (!audioRef.current) {
      return
    }

    jumpToConfiguredStart()

    audioRef.current
      .play()
      .then(() => {
        setAudioReadyByClick(false)
      })
      .catch(() => {
        setAudioReadyByClick(true)
      })
  }

  const toggleMusic = () => {
    if (!audioRef.current) {
      return
    }

    if (audioRef.current.paused) {
      audioRef.current
        .play()
        .then(() => {
          setAudioReadyByClick(false)
        })
        .catch(() => {
          setAudioReadyByClick(true)
        })
      return
    }

    audioRef.current.pause()
  }

  const openCreateModal = () => {
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setFormData({ date: '', note: '', photo: '', alt: '' })
  }

  const onFormChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const addMemory = (event) => {
    event.preventDefault()

    if (!formData.date.trim() || !formData.note.trim()) {
      return
    }

    const nextId =
      memories.length === 0 ? 1 : Math.max(...memories.map((memory) => memory.id)) + 1
    const nextMemory = {
      id: nextId,
      date: formData.date.trim(),
      note: formData.note.trim(),
      photo:
        formData.photo.trim() ||
        'https://images.unsplash.com/photo-1477506350614-33c8d877a5fe?auto=format&fit=crop&w=1200&q=80',
      alt: formData.alt.trim() || 'Fotografia analogica de un recuerdo romantico',
    }

    setMemories((current) => [...current, nextMemory])
    setActiveId(nextId)
    closeCreateModal()
  }

  const toggleMemory = (id) => {
    setActiveId((current) => (current === id ? null : id))
  }

  return (
    <main
      className="relative z-10 mx-auto min-h-screen w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6"
      style={{ maxWidth: '48rem', margin: '0 auto', padding: '2.5rem 1rem 5rem' }}
    >
      <audio ref={audioRef} src={AUDIO_SOURCE} preload="auto" loop />

      <header
        className="mb-10 text-center"
        style={{ textAlign: 'center', marginBottom: '2.5rem', animation: 'fadeUp 650ms var(--ease) both' }}
      >
        <p className="m-0 text-xs uppercase tracking-[0.18em] text-rose-500/80">
          Coleccion de instantes
        </p>
        <h1
          className="my-2 text-4xl font-normal leading-tight text-rose-900 sm:text-5xl"
          style={{
            fontFamily: 'Italiana, serif',
            fontSize: 'clamp(2.1rem, 6vw, 3.4rem)',
            animation: 'titleGlow 4.2s ease-in-out infinite',
          }}
        >
          Nuestra linea de tiempo
        </h1>
        <p className="m-0 text-base text-rose-700/90 sm:text-lg">
          Toca cada nodo y revive un recuerdo.
        </p>
      </header>

      <section className="relative" style={{ position: 'relative' }}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-5 top-0 w-[2px] rounded-full"
          style={{
            background:
              'linear-gradient(180deg, #fff3f8 0%, #f7b2cf 30%, #e63191 60%, #f7b2cf 85%, #fff3f8 100%)',
            backgroundSize: '100% 240px',
            animation: 'shimmerLine 7s linear infinite',
            boxShadow: '0 0 16px rgba(230, 49, 145, 0.25)',
          }}
        />

        <ol
          className="m-0 list-none space-y-5 p-0"
          aria-label="Linea de tiempo de recuerdos"
          style={{ listStyle: 'none', margin: 0, padding: 0 }}
        >
        {memories.map((memory, index) => {
          const isActive = activeId === memory.id
          const tone = mixColor([255, 247, 250], [236, 63, 147], index / Math.max(memories.length - 1, 1))

          return (
            <li
              key={memory.id}
              className="group relative pl-14"
              style={{
                position: 'relative',
                paddingLeft: '3.5rem',
                animation: 'fadeUp 550ms cubic-bezier(0.22, 1, 0.36, 1) both',
                animationDelay: `${index * 70}ms`,
              }}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-[-0.25rem] inset-y-0 -z-10 rounded-2xl opacity-80"
                style={{
                  background: `linear-gradient(90deg, ${tone}22, rgba(255,255,255,0.75))`,
                }}
              />

              <button
                type="button"
                className="absolute left-[13px] top-1 h-5 w-5 rounded-full border-2 border-white transition-transform duration-200 hover:scale-110 focus-visible:scale-110 focus-visible:outline-none"
                onClick={() => toggleMemory(memory.id)}
                aria-expanded={isActive}
                aria-controls={`memory-card-${memory.id}`}
                aria-label={`Abrir recuerdo del ${memory.date}`}
                style={{
                  background: tone,
                  animation: `softPulse ${isActive ? '1.8s' : '3.6s'} ease-in-out infinite`,
                  boxShadow: '0 0 0 4px rgba(255, 238, 244, 0.8), 0 7px 14px rgba(171, 85, 122, 0.24)',
                }}
              />

              <p
                className="mb-2 flex flex-wrap items-baseline gap-2 text-xs uppercase tracking-[0.11em] text-rose-700/80"
                style={{ marginBottom: '0.5rem', letterSpacing: '0.11em' }}
              >
                <span>{memory.date}</span>
                <span className="normal-case tracking-normal text-rose-900/80">{memory.alt}</span>
              </p>

              <div
                id={`memory-card-${memory.id}`}
                className={`overflow-hidden transition-all duration-500 ease-out ${
                  isActive ? 'max-h-[680px] opacity-100' : 'max-h-0 opacity-0'
                }`}
                aria-hidden={!isActive}
                style={{
                  transformOrigin: 'top center',
                  transform: isActive ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.985)',
                  transition:
                    'max-height 520ms var(--ease), opacity 420ms var(--ease), transform 420ms var(--ease)',
                }}
              >
                <article
                  className="grid gap-4 rounded-2xl border border-rose-200/90 bg-[rgba(255,250,245,0.9)] p-3 shadow-xl sm:p-4 md:grid-cols-[1.1fr_0.9fr] md:items-center"
                  style={{
                    display: 'grid',
                    gap: '1rem',
                    borderLeft: `3px solid ${tone}`,
                    borderRadius: '1rem',
                    border: '1px solid rgba(251, 191, 206, 0.9)',
                    background: 'rgba(255, 250, 245, 0.9)',
                    padding: '0.9rem',
                  }}
                >
                  <figure
                    className="m-0 overflow-hidden rounded-xl border-8 border-[#fffaf6] bg-[#f8ede5] outline outline-1 outline-[#efdae1] transition-transform duration-500 group-hover:-translate-y-0.5"
                    style={{ aspectRatio: memory.type === 'video' ? '16/9' : '4/3' }}
                  >
                    {memory.type === 'video' ? (
                      <iframe
                        src={`https://player.cloudinary.com/embed/?cloud_name=${memory.cloudName}&public_id=${memory.videoPublicId}&autoplay=false&muted=true&controls=true`}
                        title={memory.alt}
                        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                        allowFullScreen
                        frameBorder="0"
                        className="h-full w-full"
                      />
                    ) : (
                      <img
                        src={memory.photo}
                        alt={memory.alt}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        style={{ filter: 'sepia(0.28) contrast(0.94) saturate(0.9)' }}
                      />
                    )}
                  </figure>
                  <p
                    className="m-0 px-2 pb-2 pt-1 text-3xl leading-tight text-rose-900/80 sm:text-4xl"
                    style={{ fontFamily: 'Great Vibes, cursive', fontSize: 'clamp(1.9rem, 4.5vw, 2.6rem)' }}
                  >
                    {memory.note}
                  </p>
                </article>
              </div>
            </li>
          )
        })}
        </ol>
      </section>

      <button
        type="button"
        className="fixed bottom-4 left-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-rose-200/90 bg-rose-50/90 text-[1.35rem] font-light text-rose-800/85 backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:-translate-y-0.5 focus-visible:outline-none"
        aria-label="Agregar nuevo recuerdo"
        onClick={openCreateModal}
        style={{ color: rememberButtonTone }}
      >
        +
      </button>

      <button
        type="button"
        className={`fixed bottom-4 right-4 z-20 grid h-10 w-10 place-items-center rounded-full border border-rose-200/90 bg-rose-50/90 text-[1.05rem] text-rose-800/85 backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:-translate-y-0.5 focus-visible:outline-none ${
          isPlaying ? 'text-[#cf2b86] shadow-[0_0_0_5px_rgba(230,106,166,0.16)]' : ''
        }`}
        onClick={toggleMusic}
        aria-label={isPlaying ? 'Pausar musica' : 'Reproducir musica'}
      >
        ♪
      </button>

      {audioReadyByClick ? (
        <p className="fixed bottom-16 right-4 z-20 m-0 rounded-full border border-rose-200/85 bg-rose-50/95 px-3 py-1 text-xs text-rose-800/85">
          Toca en cualquier parte para activar la musica.
        </p>
      ) : null}

      {showIntro ? (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-[rgba(244,199,216,0.28)] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <article className="w-full max-w-lg rounded-3xl border border-rose-200/90 bg-[rgba(255,250,246,0.96)] p-6 text-center shadow-2xl">
            <p className="m-0 text-lg leading-relaxed text-rose-900/85">
              Esta cancion muestra perfectamente lo que siento y quiero contigo mi amor. Te
              amo.
            </p>
            <button
              type="button"
              onClick={startExperience}
              className="mt-4 rounded-full bg-gradient-to-r from-rose-300 to-pink-500 px-5 py-2 text-white transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:-translate-y-0.5 focus-visible:outline-none"
            >
              Empezar
            </button>
          </article>
        </div>
      ) : null}

      {showCreateModal ? (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-[rgba(244,199,216,0.28)] p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <article className="w-full max-w-lg rounded-3xl border border-rose-200/90 bg-[rgba(255,250,246,0.96)] p-4 shadow-2xl">
            <header className="mb-2 flex items-center justify-between">
              <h2
                className="m-0 text-[1.75rem] font-normal text-rose-950/80"
                style={{ fontFamily: 'Italiana, serif' }}
              >
                Nuevo recuerdo
              </h2>
              <button
                type="button"
                className="h-8 w-8 rounded-full bg-rose-100 text-rose-700"
                onClick={closeCreateModal}
              >
                ×
              </button>
            </header>
            <form onSubmit={addMemory} className="grid gap-2.5">
              <label className="grid gap-1 text-[0.9rem] text-rose-700/85">
                Fecha
                <input
                  name="date"
                  value={formData.date}
                  onChange={onFormChange}
                  placeholder="07 ABR 2026"
                  required
                  className="w-full rounded-xl border border-rose-200 bg-[#fffdfb] px-3 py-2 text-rose-900/80 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300"
                />
              </label>
              <label className="grid gap-1 text-[0.9rem] text-rose-700/85">
                Mensaje
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={onFormChange}
                  placeholder="Escribe tu recuerdo..."
                  rows="3"
                  required
                  className="w-full rounded-xl border border-rose-200 bg-[#fffdfb] px-3 py-2 text-rose-900/80 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300"
                />
              </label>
              <label className="grid gap-1 text-[0.9rem] text-rose-700/85">
                URL de foto
                <input
                  name="photo"
                  value={formData.photo}
                  onChange={onFormChange}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-rose-200 bg-[#fffdfb] px-3 py-2 text-rose-900/80 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300"
                />
              </label>
              <label className="grid gap-1 text-[0.9rem] text-rose-700/85">
                Descripcion de la foto
                <input
                  name="alt"
                  value={formData.alt}
                  onChange={onFormChange}
                  placeholder="Descripcion breve"
                  className="w-full rounded-xl border border-rose-200 bg-[#fffdfb] px-3 py-2 text-rose-900/80 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300"
                />
              </label>
              <button
                type="submit"
                className="mt-1 rounded-full bg-gradient-to-r from-rose-300 to-pink-500 px-4 py-2 text-white transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:-translate-y-0.5 focus-visible:outline-none"
              >
                Guardar recuerdo
              </button>
            </form>
          </article>
        </div>
      ) : null}
    </main>
  )
}

export default App
