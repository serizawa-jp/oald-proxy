import NextCors from 'nextjs-cors';

const got = require('got');
const cheerio = require('cheerio');

const capitalize = (s) => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default async (req, res) => {
  await NextCors(req, res, {
    methods: ['GET', 'HEAD', 'POST'],
    origin: '*',
    optionsSuccessStatus: 200,
  });

  if (req.method !== 'POST') {
    res.status(405).send("");
    return;
  }
  const word = req.body?.word.replace(/ /g, '-').toLowerCase();
  if (word === undefined) {
    res.status(403).send("word is required");
    return;
  }

  const url = encodeURI(`https://www.oxfordlearnersdictionaries.com/definition/english/${word}`);

  let response = null;

  try {
    response = await got(url);
  } catch(e) {
    res.status(404).send("");
    return;
  }

  const $ = cheerio.load(response.body);
  const id = response.requestUrl.substring(response.requestUrl.lastIndexOf('/') + 1);
  const audioFile = $(".webtop>.phonetics .phons_n_am .sound").data("src-mp3")?.trim();
  const phoneticSpelling = $(".webtop>.phonetics .phons_n_am .phon").text()?.trim();
  const pronunciation = new Pronunciation(phoneticSpelling, audioFile)

  const senses = $(".entry>.senses_multiple .sense,.entry>.sense_single .sense").map((_, el) => {
    const $$ = cheerio.load(el);

    const definition = $$(".def").text()?.trim();
    const examples = $$(".examples>li").map((_, el) => cheerio.load(el).text().trim()).get();
    return new Sense([definition], examples);
  }).get();

  const entry = new Entry([pronunciation], senses)
  const lexicalCategory = $(".webtop>.pos").text()?.trim();
  const lexicalEntries = [
    new LexicalEntry([entry], capitalize(lexicalCategory)),
  ];
  const resp = new Result(id, response.requestUrl, lexicalEntries)
  res.status(200).json(resp)
}

class Result {
  constructor(public id: string, public url: string, public lexicalEntries: Array<LexicalEntry>) { }
}

class LexicalEntry {
  constructor(public entries: Array<Entry>, public lexicalCategory: string) { }
}

class Entry {
  constructor(public pronunciations: Array<Pronunciation>, public senses: Array<Sense>, public etymologies?: Array<string>) { }

}

class Pronunciation {
  constructor(public phoneticSpelling: string, public audioFile: string) { }
}

class Sense {
  constructor(public definitions: Array<string>, public examples: Array<string>) { }
}