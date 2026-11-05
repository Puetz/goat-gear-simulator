const STEAM_URL = 'https://store.steampowered.com/app/3601690/';
const REPOSITORY_URL = 'https://github.com/Puetz/goat-gear-simulator';

const LINK = 'underline underline-offset-2 hover:text-white';

/** The disclaimer and links under the app. */
export function Footer() {
  return (
    <footer className="flex flex-wrap justify-between gap-x-6 gap-y-1 px-1 pt-3.5 text-caption text-sheet">
      <p>
        Unofficial fan project, made with the permission of Tobi & Mick, the makers of{' '}
        <a href={STEAM_URL} className={LINK}>
          GOAT
        </a>
        . Game data from demo 0.5.6.
      </p>
      <nav aria-label="About this site" className="flex gap-4">
        {/* GitHub's issue chooser: the wrong-number form or a blank issue for anything else. */}
        <a href={`${REPOSITORY_URL}/issues/new/choose`} className={LINK}>
          Report a bug or wrong number
        </a>
        <a href={REPOSITORY_URL} className={LINK}>
          Source code
        </a>
        {/* Written by the production build (build.license in vite.config.ts). */}
        <a href={`${import.meta.env.BASE_URL}licenses.txt`} className={LINK}>
          Third-party licenses
        </a>
      </nav>
    </footer>
  );
}
