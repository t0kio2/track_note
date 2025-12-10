import { redirect } from "next/navigation";

export default function Page({ params }: { params: { videoId: string } }) {
  return redirect(`/progress/${params.videoId}`);
}

