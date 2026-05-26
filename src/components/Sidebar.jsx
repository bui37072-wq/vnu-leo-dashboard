function Sidebar() {

  const menu = [
    "Dashboard",
    "Satellites",
    "Gateways",
    "Monitoring"
  ]

  return (

    <div className="w-64 h-screen bg-gray-900 text-white p-5">

      <h1 className="text-2xl font-bold text-green-400 mb-10">
        VNU LEO
      </h1>

      <ul className="space-y-4">

        {menu.map((item) => (

          <li
            key={item}

            className="
              p-3
              rounded-xl
              cursor-pointer
              hover:bg-green-500
              hover:text-black
              transition
              duration-300
            "
          >
            {item}
          </li>

        ))}

      </ul>

    </div>
  )
}

export default Sidebar