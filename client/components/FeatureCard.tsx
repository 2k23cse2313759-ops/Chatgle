type Props = {
  title: string;
};

export default function FeatureCard({ title }: Props) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-lg transition duration-300 hover:scale-105 hover:bg-white/10">
      <h3 className="text-2xl font-semibold text-white">
        {title}
      </h3>
    </div>
  );
}