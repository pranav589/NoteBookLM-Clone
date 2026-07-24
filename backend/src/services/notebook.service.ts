import { Notebook, Source, ChatMessage, INotebook, ISource } from "../lib/db";
import { deleteNotebookVectors } from "../lib/rag-helper";

export class NotebookService {
  public static async listNotebooks(): Promise<INotebook[]> {
    return Notebook.find({}).sort({ createdAt: -1 });
  }

  public static async createNotebook(name: string): Promise<INotebook> {
    const notebook = new Notebook({ name: name.trim() });
    await notebook.save();
    return notebook;
  }

  public static async getNotebookDetails(
    id: string
  ): Promise<{ notebook: INotebook; sources: ISource[] }> {
    const notebook = await Notebook.findById(id);
    if (!notebook) {
      throw new Error("Notebook not found");
    }

    const sources = await Source.find({ notebookId: id }).sort({ createdAt: -1 });
    return { notebook, sources };
  }

  public static async deleteNotebook(id: string): Promise<void> {
    const notebook = await Notebook.findById(id);
    if (!notebook) {
      throw new Error("Notebook not found");
    }

    // 1. Delete all vectors associated with this notebook in Qdrant
    try {
      await deleteNotebookVectors(id);
    } catch (vectorErr) {
      console.error(
        "Warning: Failed to delete Qdrant vectors for notebook:",
        id,
        vectorErr
      );
    }

    // 2. Delete all sources in MongoDB for this notebook
    await Source.deleteMany({ notebookId: id });

    // 3. Delete all chat messages in MongoDB for this notebook
    await ChatMessage.deleteMany({ notebookId: id });

    // 4. Delete the notebook itself in MongoDB
    await Notebook.findByIdAndDelete(id);
  }
}
