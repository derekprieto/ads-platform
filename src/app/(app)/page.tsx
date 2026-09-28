import { Chat } from "@/components/Chat";
import { Gallery } from "@/components/Gallery";
import { Editor } from "@/components/Editor";

export default function CreatePage() {
  return (
    <>
      <div className="split">
        <Chat />
        <Gallery />
      </div>
      <Editor />
    </>
  );
}
