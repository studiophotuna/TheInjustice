// A photo of the car model (public/cars/<model>.jpg).
export function CarPhoto({ model, className = "" }: { model: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`car-photo ${className}`} src={`/cars/${model}.jpg`} alt="" loading="lazy" />;
}
