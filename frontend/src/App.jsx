import { useEffect } from "react";
import Home from "./home";
import getCurrentUser from "./features/getCurrentUser";
import { useDispatch } from "react-redux";
import { setUserdata } from "./redux/userSlice";

/**
 * ============================================================================
 * ROOT APP COMPONENT (`App.jsx`)
 * ============================================================================
 * Fetches the active user's session profile from the API Gateway on initial load
 * and initializes Redux global user state.
 * ============================================================================
 */
function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const getUser = async () => {
      try {
        const data = await getCurrentUser();
        if (data) {
          dispatch(setUserdata(data));
        }
      } catch (error) {
        console.error("Failed to load current user session:", error);
      }
    };

    getUser();
  }, [dispatch]);

  return <Home />;
}

export default App;