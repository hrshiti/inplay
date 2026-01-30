import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MovieDetailsPage from '../MovieDetailsPage'; // Adjust path if needed
import contentService from '../services/api/contentService'; // Adjust path

export default function MovieDetailsWrapper(props) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        // We construct a "skeleton" movie object with just ID to pass to MovieDetailsPage
        // effectively interacting with its internal useEffect that fetches full details.
        // OR we can fetch here to be sure. 
        // MovieDetailsPage checks for (movie._id || movie.id).

        // Optimally, we fetch minimal info or just pass ID if possible.
        // But MovieDetailsPage expects a 'movie' object to start with.

        const fetchContent = async () => {
            try {
                // If we want to rely on MovieDetailsPage fetching logic:
                setMovie({ _id: id, id: id });
                setLoading(false);
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };

        fetchContent();
    }, [id]);

    const handleClose = () => {
        // Go back in history
        navigate(-1);
    };

    if (loading) return <div style={{ color: 'white', padding: 20 }}>Loading...</div>;
    if (!movie) return <div style={{ color: 'white', padding: 20 }}>Content not found</div>;

    const isPaidContent = movie.isPaid;
    const isPurchased = props.purchasedContent && (props.purchasedContent.includes(movie._id) || props.purchasedContent.includes(movie.id));

    return (
        <MovieDetailsPage
            {...props}
            movie={movie}
            isPurchased={isPurchased}
            onClose={handleClose}
            onSelectMovie={(m) => navigate(`/content/${m._id || m.id}`)}
        />
    );
}
