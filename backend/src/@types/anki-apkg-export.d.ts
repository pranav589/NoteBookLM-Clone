declare module "anki-apkg-export" {
  export default class AnkiExport {
    constructor(deckName: string, template?: any);
    addCard(front: string, back: string, options?: any): this;
    addMedia(filename: string, content: any): this;
    save(): Promise<any>;
  }
}
