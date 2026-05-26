import { useEffect, useState } from "react"

function ActivityLog() {

  const [logs, setLogs] = useState([

    "[10:00] System Initialized",

    "[10:01] SAT-01 Connected",

    "[10:02] Gateway Online"

  ])

  useEffect(() => {

    const messages = [

      "High latency detected",

      "Gateway switched",

      "SAT-02 Connected",

      "Packet loss warning",

      "User connected",

      "Network stabilized",

      "Satellite handover completed"

    ]

    const interval = setInterval(() => {

      const randomMessage =

        messages[
          Math.floor(
            Math.random() * messages.length
          )
        ]

      const now = new Date()

      const time =

        `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`

      setLogs((prev) => [

        `[${time}] ${randomMessage}`,

        ...prev.slice(0, 6)

      ])

    }, 3000)

    return () => clearInterval(interval)

  }, [])

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
        Network Activity Log
      </h2>

      <div className="space-y-3">

        {

          logs.map((log, index) => (

            <div
              key={index}

              className="
                bg-black
                p-3
                rounded-lg
                border
                border-gray-800
                text-green-400
                font-mono
                text-sm
              "
            >

              {log}

            </div>

          ))

        }

      </div>

    </div>
  )
}

export default ActivityLog