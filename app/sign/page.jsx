import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SignReader from "./SignReader";

export const metadata = {
  title: "Sign Reader — Rushd AlAshqar",
  description:
    "Read ASL fingerspelling from your webcam in the browser using MediaPipe hand tracking and a k-NN classifier you train yourself.",
};

export default function SignPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Sign{" "}
          <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
            Reader
          </span>
        </h1>
        <p className="mt-3 max-w-3xl text-lg text-muted">
          Fingerspell in ASL and watch it turn into text. Your webcam feed is
          tracked with MediaPipe&apos;s 21-point hand model, normalized for
          position, size and handedness, then matched against handshapes you
          record yourself with a k-nearest-neighbours classifier.
        </p>
        <div className="mt-10">
          <SignReader />
        </div>
      </main>
      <Footer />
    </>
  );
}
