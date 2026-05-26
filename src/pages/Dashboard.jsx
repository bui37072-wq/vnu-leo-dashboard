import { useEffect, useState } from "react"

import Sidebar from "../components/Sidebar"
import LatencyChart from "../components/LatencyChart"
import SatellitePanel from "../components/SatellitePanel"
import ActivityLog from "../components/ActivityLog"

function Dashboard() {

  const [users, setUsers] = useState(1280)

  const [latency, setLatency] = useState(42)

  const [status, setStatus] = useState("ONLINE")

  const [alert, setAlert] = useState(false)

  useEffect(() => {

    const interval = setInterval(() => {

      const randomUsers =
        Math.floor(Math.random() * 2000)

      const randomLatency =
        Math.floor(Math.random() * 100)

      setUsers(randomUsers)

      setLatency(randomLatency)

      if (randomLatency < 50) {

        setStatus("ONLINE")

        setAlert(false)

      }

      else if (randomLatency < 80) {

        setStatus("WARNING")

        setAlert(false)

      }

      else {

        setStatus("CRITICAL")

        setAlert(true)

      }

    }, 1000)

    return () => clearInterval(interval)

  }, [])

  return (

    <div className="flex bg-black min-h-screen text-white">

      <Sidebar />

      <div className="flex-1 p-8">

        <h1 className="text-4xl font-bold mb-8">
          Satellite Dashboard
        </h1>

        {

          alert && (

            <div className="
              bg-red-600
              text-white
              p-4
              rounded-2xl
              mb-6
              animate-pulse
              shadow-lg
              shadow-red-500/50
            ">

              🚨 CRITICAL NETWORK LATENCY DETECTED

            </div>

          )

        }

        <div className="grid grid-cols-4 gap-6">

          <div className="
            bg-gray-900
            p-6
            rounded-2xl
            hover:scale-105
            transition
            duration-300
          ">

            <h2 className="text-gray-400">
              Satellites
            </h2>

            <p className="
              text-3xl
              text-green-400
              font-bold
            ">
              24
            </p>

          </div>

          <div className="
            bg-gray-900
            p-6
            rounded-2xl
            hover:scale-105
            transition
            duration-300
          ">

            <h2 className="text-gray-400">
              Users
            </h2>

            <p className="
              text-3xl
              text-cyan-400
              font-bold
            ">
              {users}
            </p>

          </div>

          <div className="
            bg-gray-900
            p-6
            rounded-2xl
            hover:scale-105
            transition
            duration-300
          ">

            <h2 className="text-gray-400">
              Latency
            </h2>

            <p className="
              text-3xl
              text-yellow-400
              font-bold
            ">
              {latency} ms
            </p>

          </div>

          <div className="
            bg-gray-900
            p-6
            rounded-2xl
            hover:scale-105
            transition
            duration-300
          ">

            <h2 className="text-gray-400">
              Network Status
            </h2>

            <p className={`
              text-3xl
              font-bold
              ${
                status === "ONLINE"
                  ? "text-green-400"
                  : status === "WARNING"
                  ? "text-yellow-400"
                  : "text-red-500"
              }
            `}>

              {status}

            </p>

          </div>

        </div>

        <LatencyChart />

        <SatellitePanel />

        <ActivityLog />

      </div>

    </div>
  )
}

export default Dashboard