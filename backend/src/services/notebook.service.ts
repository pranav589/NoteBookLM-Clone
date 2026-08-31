import { Notebook, Source, ChatMessage, INotebook, ISource } from "../lib/db";
import { deleteNotebookVectors } from "../rag";

export class NotebookService {
  public static async listNotebooks(userEmail: string, search?: string): Promise<any[]> {
    const filter: any = { userEmail };
    if (search && search.trim().length > 0) {
      filter.name = { $regex: search.trim(), $options: "i" };
    }
    const notebooks = await Notebook.find(filter).sort({ createdAt: -1 });
    const result = await Promise.all(
      notebooks.map(async (nb) => {
        const sourcesCount = await Source.countDocuments({ notebookId: nb._id });
        return {
          ...nb.toObject(),
          sourcesCount,
        };
      })
    );
    return result;
  }

  public static async createNotebook(name: string, userEmail: string): Promise<INotebook> {
    const notebook = new Notebook({ name: name.trim(), userEmail });
    await notebook.save();
    return notebook;
  }

  public static async getNotebookDetails(
    id: string,
    userEmail: string
  ): Promise<{ notebook: INotebook; sources: ISource[] }> {
    const notebook = await Notebook.findById(id);
    if (!notebook || notebook.userEmail !== userEmail) {
      throw new Error("Notebook not found");
    }

    const sources = await Source.find({ notebookId: id }).sort({ createdAt: -1 });
    return { notebook, sources };
  }

  public static async deleteNotebook(id: string, userEmail: string): Promise<void> {
    const notebook = await Notebook.findById(id);
    if (!notebook || notebook.userEmail !== userEmail) {
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
