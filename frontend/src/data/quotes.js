// A mix of well-documented real quotes (attributed) and short proverb-style
// sayings (left unattributed rather than guessing a source) -- avoids
// misattributing anything, consistent with this project's "no invented
// data" stance. Rotates once per real calendar day (day-of-year modulo
// list length), not randomly on every page load, so it's stable all day.
export const DAILY_QUOTES = [
  { text: 'Wine is bottled poetry.', author: 'Robert Louis Stevenson' },
  { text: 'Adopt the pace of nature: her secret is patience.', author: 'Ralph Waldo Emerson' },
  { text: 'Wine is one of the most civilized things in the world.', author: 'Ernest Hemingway' },
  { text: 'Great things are done by a series of small things brought together.', author: 'Vincent van Gogh' },
  { text: 'There is no such thing as a great wine, there are only great bottles.', author: 'Émile Peynaud' },
  { text: 'Every harvest begins with a single vine.' },
  { text: 'Good wine, good cheer, good harvest.' },
  { text: 'Patience makes the sweetest grapes.' },
  { text: 'The earth remembers every season it has given.' },
  { text: 'A good harvest rewards those who tend it with care.' },
  { text: 'Sunshine and rain, patience and time — that’s how a harvest is made.' },
  { text: 'The vineyard teaches what the calendar cannot: the value of waiting.' },
  { text: 'Every grape holds a whole season’s story.' },
  { text: 'A good year is grown, not guessed.' },
]

export function getDailyQuote(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date - start) / 86400000)
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length]
}
