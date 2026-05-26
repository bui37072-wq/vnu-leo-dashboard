import { useEffect, useState } from "react"

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js"

import { Line } from "react-chartjs-2"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

function LatencyChart() {

  const [latencyData, setLatencyData] = useState([
    42,
    38,
    55,
    47,
    40
  ])

  useEffect(() => {

    const interval = setInterval(() => {

      setLatencyData((prev) => [

        ...prev.slice(1),

        Math.floor(Math.random() * 100)

      ])

    }, 1000)

    return () => clearInterval(interval)

  }, [])

  const data = {

    labels: [
      "10:00",
      "10:01",
      "10:02",
      "10:03",
      "10:04"
    ],

    datasets: [
      {
        label: "Network Latency",

        data: latencyData,

        borderColor: "cyan",

        backgroundColor: "cyan",

        tension: 0.4
      }
    ]
  }

  const options = {

    responsive: true,

    plugins: {
      legend: {
        labels: {
          color: "white"
        }
      }
    },

    scales: {

      x: {
        ticks: {
          color: "white"
        }
      },

      y: {
        ticks: {
          color: "white"
        }
      }

    }

  }

  return (

    <div className="bg-gray-900 p-6 rounded-2xl mt-8">

      <h2 className="text-2xl text-white mb-4">
        Network Latency
      </h2>

      <Line
        data={data}
        options={options}
      />

    </div>
  )
}

export default LatencyChart