// @ts-ignore
import AnkiExport from "anki-apkg-export";
import { IFlashcard } from "../models/Flashcard";

export class AnkiService {
  /**
   * Generates a native Anki deck file (.apkg) from a list of flashcards.
   * @param deckName Name of the Anki deck
   * @param cards Array of flashcards
   * @returns Binary buffer of the zipped Anki deck
   */
  public static async exportDeck(deckName: string, cards: IFlashcard[]): Promise<Buffer> {
    const apkg = new AnkiExport(deckName);

    for (const card of cards) {
      // Strip HTML if necessary, or pass clean front/back.
      // Anki supports basic HTML, which we can keep.
      apkg.addCard(card.front, card.back);
    }

    const zipContent = await apkg.save();
    return Buffer.from(zipContent, "binary");
  }
}
