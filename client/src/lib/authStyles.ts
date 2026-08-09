/* Shared class strings for auth forms — use the token system so auth pages
   pick up light/dark themes automatically. */

export const authLabel =
  'block font-heading text-[10px] uppercase tracking-[0.06em] font-semibold text-on-surface-variant mb-1.5'

export const authInput =
  'w-full px-3.5 py-2.5 text-[14px] font-body-md text-on-surface bg-surface-container border border-outline-variant/30 rounded-lg placeholder:text-on-surface-variant/50 outline-none transition-colors duration-150 focus:border-primary focus:ring-1 focus:ring-primary/25'

export const authBtnPrimary =
  'w-full bg-primary text-on-primary font-heading text-[11px] uppercase tracking-[0.06em] font-semibold py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

export const authBtnSecondary =
  'flex items-center justify-center gap-2 border border-outline-variant/40 py-2.5 px-3 rounded-lg text-[12px] font-body-md text-on-surface hover:bg-surface-container hover:border-outline/40 transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

export const authErrorBanner =
  'mb-4 px-3.5 py-2.5 rounded-lg bg-warning/10 border border-warning/30 font-body-md text-[12.5px] text-warning'