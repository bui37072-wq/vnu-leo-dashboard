function SatellitePanel() {

  const satellites = [

    {
      id: "SAT-01",
      status: "ONLINE"
    },

    {
      id: "SAT-02",
      status: "WARNING"
    },

    {
      id: "SAT-03",
      status: "ONLINE"
    },

    {
      id: "SAT-04",
      status: "CRITICAL"
    }

  ]

  return (

    <div className="
      bg-gray-900
      p-6
      rounded-2xl
      mt-8
    ">

      <h2 className="
        text-2xl
        text-white
        mb-6
      ">
        Satellite Monitoring
      </h2>

      <div className="
        grid
        grid-cols-2
        gap-4
      ">

        {

          satellites.map((sat) => (

            <div
              key={sat.id}

              className="
                bg-black
                p-5
                rounded-xl
                border
                border-gray-700
                hover:border-cyan-400
                transition
                duration-300
              "
            >

              <h3 className="
                text-xl
                text-cyan-400
                font-bold
              ">
                {sat.id}
              </h3>

              <p className={`
                mt-2
                font-bold

                ${sat.status === "ONLINE"
                  ? "text-green-400"
                  : sat.status === "WARNING"
                  ? "text-yellow-400"
                  : "text-red-500"}
              `}>

                {sat.status}

              </p>

              <div className="
                mt-4
                h-2
                bg-gray-700
                rounded-full
                overflow-hidden
              ">

                <div className={`
                  h-2
                  rounded-full
                  animate-pulse

                  ${sat.status === "ONLINE"
                    ? "bg-green-400 w-[90%]"
                    : sat.status === "WARNING"
                    ? "bg-yellow-400 w-[60%]"
                    : "bg-red-500 w-[30%]"}
                `} />

              </div>

            </div>

          ))

        }

      </div>

    </div>
  )
}

export default SatellitePanel