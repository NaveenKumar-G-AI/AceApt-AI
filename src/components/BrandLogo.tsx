import Image from "next/image";

export function BrandLogo() {
  return (
    <>
      <Image
        src="/prepvista.png"
        alt="PrepVista"
        width={40}
        height={40}
        priority
        className="brand-logo"
      />
      <span className="brand-copy">
        <span className="brand-name">PrepVista</span>
        <span className="brand-subtitle">Aptitude workspace</span>
      </span>
    </>
  );
}
