import { getChatGPTUser } from "@/app/chatgpt-auth";
import { deleteSource } from "@/lib/nova/persistence";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await context.params;
  const deleted = await deleteSource(user.userId, id);
  return deleted
    ? Response.json({ deleted: true })
    : Response.json({ error: "That item was not found." }, { status: 404 });
}
