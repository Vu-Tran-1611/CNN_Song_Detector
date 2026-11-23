export type SongLinks = {
  artwork: string;
  appleMusic: string;
};

const SONG_LINKS: Record<number, SongLinks> = {
  0: {
    artwork: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a8/e2/1b/a8e21b3b-9c8d-2974-2318-6bcd4c9d2370/075679884336.jpg/300x300bb.jpg",
    appleMusic: "https://music.apple.com/us/album/attention/1293229669?i=1293229677",
  },
  1: {
    artwork: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/6f/bc/e6/6fbce6c4-c38c-72d8-4fd0-66cfff32f679/20UMGIM12176.rgb.jpg/300x300bb.jpg",
    appleMusic: "https://music.apple.com/us/album/blinding-lights/1499378108?i=1499378607",
  },
  2: {
    artwork: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/2a/aa/b4/2aaab42a-a4cb-a600-4a25-d78961495960/18UMGIM17204.rgb.jpg/300x300bb.jpg",
    appleMusic: "https://music.apple.com/us/album/i-was-never-there/1363309866?i=1363310498",
  },
  3: {
    artwork: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/db/7b/8e/db7b8e26-c198-903e-671e-e6b56859db5b/43396499461.jpg/300x300bb.jpg",
    appleMusic: "https://music.apple.com/us/album/mystery-of-love/1816014310?i=1816015319",
  },
  4: {
    artwork: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a8/8e/f9/a88ef97a-74c3-bedf-0574-ea0b83b40a38/20UMGIM94965.rgb.jpg/300x300bb.jpg",
    appleMusic: "https://music.apple.com/us/album/positions/1537486662?i=1537486846",
  },
  5: {
    artwork: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/ba/61/bc/ba61bcaf-2034-f13e-6f66-fdb578d618dc/656605609966.jpg/300x300bb.jpg",
    appleMusic: "https://music.apple.com/us/album/should-have-known-better/955572616?i=955572619",
  },
  6: {
    artwork: "https://is1-ssl.mzstatic.com/image/thumb/Music/4e/4b/01/mzi.npqfzwyn.jpg/300x300bb.jpg",
    appleMusic: "https://music.apple.com/us/album/stereo-love/351996342?i=351996354",
  },
  7: {
    artwork: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/30/05/1e/30051e57-a63a-3acc-4b30-42568293f5f7/15UMGIM36514.rgb.jpg/300x300bb.jpg",
    appleMusic: "https://music.apple.com/us/album/the-hills/1440858094?i=1440858495",
  },
  8: {
    artwork: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/13/fd/a3/13fda38d-fc63-ddc3-1cf2-c09251adc532/25UMGIM09489.rgb.jpg/300x300bb.jpg",
    appleMusic: "https://music.apple.com/us/album/timeless/1793702595?i=1793702853",
  },
  9: {
    artwork: "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/7e/05/fd/7e05fd3e-597b-db52-5d87-3ed146d2e2bb/mzm.omtrmqdi.jpg/300x300bb.jpg",
    appleMusic: "https://music.apple.com/us/album/we-dont-talk-anymore-feat-selena-gomez/1031416178?i=1031416185",
  },
};

export function linksFor(songId: number): SongLinks | undefined {
  return SONG_LINKS[songId];
}
