import Swal from 'sweetalert2'

declare module 'sweetalert2' {
  interface SwalCustomClass {
    popup: string
  }
}

const swalMixin = Swal.mixin({
  padding: '24px',
  background: '#F9F9F9',
  color: '#1A1A1A',
  confirmButtonColor: '#000000',
  confirmButtonTextColor: '#FFFFFF',
  confirmButtonBorderRadius: '9999px',
  cancelButtonBorderRadius: '9999px',
  customClass: {
    popup: 'swal-popup-custom'
  },
  allowOutsideClick: false,
  allowEscapeKey: false,
  showConfirmButton: true,
  confirmButtonText: 'Aceptar',
  cancelButtonText: 'Cancelar',
  reverseButtons: true
})

const iconHtml: Record<string, string> = {
  warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
  error: '<i class="fa-solid fa-xmark-circle"></i>',
  success: '<i class="fa-solid fa-circle-check"></i>',
  info: '<i class="fa-solid fa-circle-info"></i>',
  userLock: '<i class="fa-solid fa-user-lock"></i>',
  clock: '<i class="fa-solid fa-clock"></i>',
  creditCard: '<i class="fa-solid fa-credit-card"></i>',
  check: '<i class="fa-solid fa-check"></i>',
  xmark: '<i class="fa-solid fa-xmark"></i>'
}

const getIconHtml = (icon: string): string => {
  return iconHtml[icon] || iconHtml.info
}

export const useSwal = () => {
  const fire = (options: {
    title?: string
    text?: string
    icon?: string
    iconHtml?: string
    showCancelButton?: boolean
    confirmButtonText?: string
    cancelButtonText?: string
    reverseButtons?: boolean
  }) => {
    return swalMixin.fire({
      title: options.title,
      text: options.text,
      icon: options.icon as 'warning' | 'error' | 'success' | 'info' | undefined,
      iconHtml: options.iconHtml ? getIconHtml(options.iconHtml) : undefined,
      showCancelButton: options.showCancelButton,
      confirmButtonText: options.confirmButtonText,
      cancelButtonText: options.cancelButtonText,
      reverseButtons: options.reverseButtons
    })
  }

  const warning = (title: string, text: string, iconKey?: string) => {
    return swalMixin.fire({
      title,
      text,
      icon: 'warning',
      iconHtml: getIconHtml(iconKey || 'warning')
    })
  }

  const error = (title: string, text: string, iconKey?: string) => {
    return swalMixin.fire({
      title,
      text,
      icon: 'error',
      iconHtml: getIconHtml(iconKey || 'xmark')
    })
  }

  const success = (title: string, text: string, iconKey?: string) => {
    return swalMixin.fire({
      title,
      text,
      icon: 'success',
      iconHtml: getIconHtml(iconKey || 'check')
    })
  }

  const info = (title: string, text: string, iconKey?: string) => {
    return swalMixin.fire({
      title,
      text,
      icon: 'info',
      iconHtml: getIconHtml(iconKey || 'info')
    })
  }

  return {
    fire,
    warning,
    error,
    success,
    info,
    Swal
  }
}