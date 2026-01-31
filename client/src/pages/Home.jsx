import { useAuth } from "../context/AuthContext";
import { NavbarDemo } from "../components/Navbar";

const Home = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="p-4 md:px-10">
        <NavbarDemo />
      </header>

      {/* Hero Section */}
      <section className="relative flex flex-col-reverse md:flex-row items-center justify-between px-6 md:px-16 py-16 lg:py-40 gap-14">
        <div className="relative md:w-1/2 text-center md:text-left space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold bg-white bg-clip-text text-[#f4622d] leading-tight">
            Odisha Pilgrim Yatra
          </h1>
          <p className="text-gray-700 text-lg md:text-xl max-w-xl">
            Experience Odisha’s sacred spirit and cultural grandeur , a journey that begins at the holy Jagannath Temple in Puri, flows through the architectural wonder of Konark, and finds peace in the ancient shrines of Bhubaneswar
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-2">
            <button className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
              Explore Temples
            </button>
            <button className="px-8 py-3 border border-orange-400 text-orange-600 rounded-2xl hover:bg-orange-100 transition-all duration-300">
              Plan Your Yatra
            </button>
          </div>
        </div>

        <div className="relative md:w-1/2 flex justify-center">
          <div className="absolute inset-0 bg-orange-300 opacity-20 blur-2xl rounded-full"></div>
          <img
            src="https://phool.co/cdn/shop/articles/172017492135594_1024x1024.jpg?v=1726044181"
            alt="Jagannath Temple"
            className="relative w-full max-w-md lg:max-w-xl rounded-3xl shadow-2xl object-cover hover:scale-[1.02] transition-transform duration-500"
          />
        </div>
      </section>

      {/* Why Travel to Odisha */}
      <section className="px-6 md:px-16 py-20 bg-white">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 lg:mb-8 text-center bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
          Why You Should Travel to Odisha
        </h2>
        <p className="text-center text-gray-600 max-w-2xl mx-auto mb-12 text-lg">
          Odisha is a land where spirituality meets nature , ancient temples,
          golden beaches, tribal culture, and rich heritage make it a perfect
          destination for pilgrims and travelers alike.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            {
              title: "Puri – The Sacred Dham",
              img: "https://assets.cntraveller.in/photos/685ba76e22966cd9daef4ba2/16:9/w_1024%2Cc_limit/GettyImages-509348753.jpg",
              desc: "One of the Char Dhams of India, famous for Lord Jagannath and the grand Rath Yatra festival.",
            },
            {
              title: "Konark – Sun Temple",
              img: "https://cdn.magicdecor.in/com/2023/02/29213046/image-1685112860-3601.jpg",
              desc: "A UNESCO World Heritage Site, known for its chariot-shaped design and intricate carvings.",
            },
            {
              title: "Bhubaneswar – City of Temples",
              img: "https://imagedelivery.net/dmcxpiIQ1lAgOmi_eg0IzQ/89cbb154-4e1b-4661-c4e7-392de0a2a200/public",
              desc: "Home to more than 700 temples blending ancient architecture with modern culture.",
            },
          ].map((place, i) => (
            <div
              key={i}
              className="group rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition"
            >
              <img
                src={place.img}
                alt={place.title}
                className="h-56 w-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="p-6 bg-white">
                <h3 className="text-xl font-semibold text-orange-600">
                  {place.title}
                </h3>
                <p className="mt-2 text-gray-600">{place.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Beaches */}
      <section className="px-6 md:px-16 py-20 bg-orange-50">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-orange-600 mb-12">
          Serene Beaches of Odisha
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <img
            src="https://static-blog.treebo.com/wp-content/uploads/2023/05/Aryapalli-Beach-1024x675.jpg"
            alt="Puri Beach"
            className="rounded-3xl shadow-lg object-cover h-80 w-full"
          />
          <div className="flex flex-col justify-center space-y-4">
            <h3 className="text-2xl font-semibold text-orange-600">
              Puri & Chandrabhaga Beach
            </h3>
            <p className="text-gray-700 text-lg">
              Odisha’s coastline offers peaceful beaches where pilgrims can
              relax after darshan. The sunrise at Chandrabhaga Beach is one of
              the most beautiful sights in eastern India.
            </p>
          </div>
        </div>
      </section>

      {/* Culture & Food */}
      <section className="px-6 md:px-16 py-20 bg-white">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-orange-600 mb-12">
          Culture & Cuisine
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Tribal & Folk Culture",
              img: "https://www.puriholidays.com/Travel_Photo/1424913653_OdishaTribes.jpg",
              desc: "Odissi dance, tribal festivals, and handloom crafts reflect Odisha’s rich artistic traditions.",
            },
            {
              title: "Sacred Food",
              img: "https://www.bunkarvalley.com/wp-content/uploads/2025/06/Mahaprasad-of-Puri.jpg",
              desc: "Mahaprasad of Jagannath Temple is considered divine and is shared by devotees from all walks of life.",
            },
            {
              title: "Local Cuisine",
              img: "https://www.treebo.com/blog/wp-content/uploads/2025/05/Pakhala-Bhata-1024x675.jpg",
              desc: "Pakhala rice, Chuda mix, and Dalma form the heart of Odia cuisine , simple yet deeply spiritual.",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition"
            >
              <img
                src={item.img}
                alt={item.title}
                className="h-52 w-full object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold text-orange-600">
                  {item.title}
                </h3>
                <p className="mt-2 text-gray-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 md:px-16 py-20 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent)]"></div>

        <h2 className="relative text-3xl md:text-4xl font-bold">
          Begin Your Sacred Journey Today
        </h2>
        <p className="relative mt-4 text-orange-100 max-w-xl mx-auto text-lg">
          Plan your Odisha pilgrimage and explore temples, beaches, and culture
          in one divine journey.
        </p>
        <button className="relative mt-8 px-10 py-3 bg-white text-orange-600 rounded-2xl font-semibold shadow-lg hover:bg-orange-100 hover:scale-105 transition-all duration-300">
          Start Your Yatra
        </button>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-600 bg-white">
        © 2026 Odisha Pilgrim. All rights reserved.
      </footer>
    </div>
  );
};

export default Home;
