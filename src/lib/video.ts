// Turns a YouTube, Vimeo, Google Drive or direct video link into something we can play on our own page.
// Shared by the public site and the admin preview so both behave the same.
export type Embed = { kind: "iframe" | "video"; src: string; thumb?: string; provider: "youtube" | "vimeo" | "drive" | "file" };

export function embedFor(url: string | null | undefined): Embed | null {
  if (!url) return null;
  let m: RegExpMatchArray | null;
  if ((m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)))
    return { kind: "iframe", provider: "youtube", src: `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`, thumb: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` };
  if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([\da-f]+))?/)))
    return { kind: "iframe", provider: "vimeo", src: `https://player.vimeo.com/video/${m[1]}?autoplay=1&title=0&byline=0&portrait=0&badge=0&dnt=1${m[2] ? `&h=${m[2]}` : ""}` };
  if ((m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/)))
    return { kind: "iframe", provider: "drive", src: `https://drive.google.com/file/d/${m[1]}/preview` };
  if (/^(https:\/\/|\/).+\.(mp4|webm)(\?.*)?$/i.test(url)) return { kind: "video", provider: "file", src: url };
  return null;
}

export const VIDEO_HELP: Record<Embed["provider"], string> = {
  vimeo: "Best choice. In Vimeo set Privacy to \"Hide from Vimeo\" and turn off title, portrait and byline for a clean player.",
  youtube: "Plays in privacy-enhanced mode. YouTube always shows its small logo, but visitors can't leave the site from the player.",
  drive: "Works, but Google Drive's player always has a pop-out button. Prefer Vimeo or an uploaded MP4 for videos.",
  file: "Uploaded video file: plays in our own player with no outside links.",
};
