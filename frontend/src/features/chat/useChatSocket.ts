import { useEffect, useRef, useState } from "react"
import { openChatSocket, type ChatEvent } from "./api"

export function useChatSocket(onEvent: (event: ChatEvent) => void, onReconnect: () => void) {
  const callbacks = useRef({ onEvent, onReconnect })
  useEffect(() => { callbacks.current = { onEvent, onReconnect } }, [onEvent, onReconnect])
  const [connection, setConnection] = useState("Łączenie…")
  useEffect(() => {
    let stopped = false
    let socket: WebSocket | undefined
    let timer: ReturnType<typeof setTimeout>
    let attempts = 0
    let connecting = false
    const retry = () => {
      if (stopped) return
      setConnection("Ponowne łączenie…")
      timer = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5)))
    }
    const connect = async () => {
      if (stopped || connecting || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return
      connecting = true
      try {
        const next = await openChatSocket()
        if (stopped) { next.close(); return }
        socket = next
        socket.onopen = () => {
          attempts = 0
          setConnection("Połączono")
          callbacks.current.onReconnect()
        }
        socket.onmessage = (event) => {
          try { callbacks.current.onEvent(JSON.parse(event.data) as ChatEvent) } catch { /* Ignore malformed events. */ }
        }
        socket.onclose = retry
        socket.onerror = () => socket?.close()
      } catch { retry() }
      finally { connecting = false }
    }
    void connect()
    const online = () => { clearTimeout(timer); if (!socket || socket.readyState === WebSocket.CLOSED) void connect() }
    window.addEventListener("online", online)
    return () => { stopped = true; clearTimeout(timer); socket?.close(); window.removeEventListener("online", online) }
  }, [])
  return connection
}
