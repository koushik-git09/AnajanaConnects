import * as ort from "onnxruntime-web"

let initialized = false

/**
 * Centralized ONNX Runtime Web WASM configuration.
 * Configures single-threaded CPU WASM execution using the matching normal WASM build.
 */
export function configureOrt(): void {
  if (initialized) return

  if (typeof window !== "undefined" && ort?.env?.wasm) {
    ort.env.wasm.numThreads = 1

    const baseUrl = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "")
    const prefix = baseUrl ? `${baseUrl}/wasm/` : "/wasm/"

    ort.env.wasm.wasmPaths = {
      wasm: `${prefix}ort-wasm-simd-threaded.wasm`,
    }
  }

  initialized = true
}

export { ort }
