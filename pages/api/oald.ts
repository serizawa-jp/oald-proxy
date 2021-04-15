const got = require('got');
const cheerio = require('cheerio');

export default async (req, res) => {
  const url = encodeURI(`https://www.oxfordlearnersdictionaries.com/definition/english/${req.query.word.replaceAll(" ", "-")}`);
  const response = await got(url);
  const $ = cheerio.load(response.body);

  const id = response.requestUrl.substring(response.requestUrl.lastIndexOf('/') + 1);
  const audioFile = $(".webtop>.phonetics .phons_n_am .sound").data("src-mp3")?.trim();
  const phoneticSpelling = $(".webtop>.phonetics .phons_n_am .phon").text()?.trim();
  const pronunciation = new Pronunciation(phoneticSpelling, audioFile)

  const senses = $(".entry>.senses_multiple .sense").map((_, el) => {
    const $$ = cheerio.load(el);

    const definition = $$(".def").text()?.trim();
    const examples = $$(".examples>li").map((_, el) => cheerio.load(el).text()).get();
    return new Sense([definition], examples);
  }).get();

  const entry = new Entry([pronunciation], senses)
  const lexicalCategory = $(".webtop>.pos").text()?.trim()
  const lexicalEntries = [
    new LexicalEntry([entry], lexicalCategory),
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