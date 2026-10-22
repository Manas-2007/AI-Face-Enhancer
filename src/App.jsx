import { useEffect, useRef, useState } from "react";
import Navbar from "./Components/Navbar";
import Hero from "./Components/Hero";
import AI_Label from "./Components/AI_Label";
import Preview from "./Components/Preview";
import Comparison from "./Components/Comparison";


function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const previewUrlRef = useRef(null);

  // Store the selected image and its local preview
  const handleImageSelect = (file) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const preview = URL.createObjectURL(file);

    previewUrlRef.current = preview;

    setSelectedImage({
      file,
      preview,
    });
  };

  // Clear the selected image
  const handleClear = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setSelectedImage(null);
  };

  // Release the preview URL when the app unmounts
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#030b1a] text-white">
      <Navbar />

      <main>
        <Hero
          selectedImage={selectedImage}
          onImageSelect={handleImageSelect}
          onClear={handleClear}
        />
        <AI_Label selectedImage={selectedImage} />
        <Preview
  selectedImage={selectedImage}
/>

<Comparison selectedImage={selectedImage} />

        {/* More sections will be added below */}
      </main>
    </div>
  );
}

export default App;