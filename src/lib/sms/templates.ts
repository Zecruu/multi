export function googleReviewLink(): string {
  return (
    process.env.GOOGLE_REVIEW_URL ||
    "https://g.page/r/REPLACE_ME/review"
  );
}

export function tplReviewPromptEs(firstName: string) {
  return `Hola ${firstName}! Gracias por visitar MultiElectric Supply. ¿Como calificas tu experiencia del 1 al 5? (1=Mala, 5=Excelente). STOP para cancelar.`;
}

export function tplPositiveFollowupEs() {
  return `¡Gracias! Compartenos tu reseña en Google: ${googleReviewLink()} - STOP para cancelar.`;
}

export function tplNegativeFollowupEs() {
  return `Gracias por tu opinion. La usaremos para mejorar. Si quieres contactarnos, llama al 787-963-0569.`;
}

export function tplStopConfirmationEs() {
  return `Has cancelado los mensajes de MultiElectric Supply. No recibiras mas mensajes.`;
}

export function tplHelpEs() {
  return `MultiElectric Supply: Llamanos al 787-963-0569 para soporte. STOP para cancelar.`;
}

export function tplAmbiguousEs() {
  return `Gracias por tu respuesta! Para ayudarnos mejor, responde con un numero del 1 al 5 (5=Excelente).`;
}
