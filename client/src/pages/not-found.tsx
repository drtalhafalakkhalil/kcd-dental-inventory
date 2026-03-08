import { Link } from "wouter";
  import { motion } from "framer-motion";
  import { Button } from "@/components/ui/button";
  import { Home, PackageX } from "lucide-react";

  export default function NotFound() {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.div
            animate={{ 
              rotate: [0, -10, 10, -10, 0],
            }}
            transition={{ 
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 2
            }}
            className="mb-8 inline-block"
          >
            <PackageX className="w-32 h-32 text-cyan-600" />
          </motion.div>
          
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Page Not Found
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <Link href="/">
            <Button className="bg-gradient-to-r from-cyan-600 to-blue-600">
              <Home className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }
  