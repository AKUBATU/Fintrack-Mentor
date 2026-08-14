// Shim declarations for third-party modules and static assets
// This reduces editor/TS server "module not found" errors for untyped packages

declare module 'clsx' {
  export default function clsx(...inputs: any[]): string
}

declare module 'tailwind-merge' {
  export function twMerge(...classNames: any[]): string
}

declare module 'vaul' {
  const _default: any
  export default _default
}

declare module 'input-otp' {
  const _default: any
  export default _default
}

declare module 'cmdk' {
  const _default: any
  export default _default
}

declare module 'sonner' {
  const _default: any
  export default _default
}

declare module 'react-router-dom' {
  const _any: any
  export = _any
}

// Static asset imports
declare module '*.css'
declare module '*.scss'
declare module '*.png'
declare module '*.jpg'
declare module '*.jpeg'
declare module '*.svg'
