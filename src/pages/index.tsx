import { AppBar } from "@/components/AppBar";
import ReviewCard from "@/components/ReviewCard";
import { useEffect, useState } from "react";
import { Review } from "@/models/Review";
import * as web3 from "@solana/web3.js";
import { fetchReviews } from "@/util/fetchReviews";
import { useWallet } from "@solana/wallet-adapter-react";
import ReviewForm from "@/components/Form";

const REVIEW_PROGRAM_ID = "J7JUrpGFMTomU98Y777X9dCqZDGHfnd73N9Gn6PsdViX";

export default function Home() {

    const connection = new web3.Connection(web3.clusterApiUrl("devnet"));
    const { publicKey, sendTransaction } = useWallet();
    const [txid, setTxid] = useState("");

    const [reviews, setReviews] = useState<Review[]>([]);

    const [title, setTitle] = useState("");
    const [rating, setRating] = useState(0);
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");

    // Add state to track if we're updating
    // const [isUpdating, setIsUpdating] = useState(true);
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);

    useEffect(() => {
        const fetchAccounts = async () => {
            await fetchReviews(REVIEW_PROGRAM_ID, connection).then(setReviews);
        };
        fetchAccounts();
    }, []);

    const handleSubmit = () => {
        const review = new Review(title, rating, description, location);
        // Set variant based on whether we're updating
        //review.variant = isUpdating ? 1 : 0;
        review.variant = 0;
        handleTransactionSubmit(review);
    };

    const handleUpdate = () => {
        if (selectedReview) {
            const review = new Review(title, rating, description, location);
            review.variant = 1; // Update variant
            handleTransactionSubmit(review);
        }
    };

    const handleTransactionSubmit = async (review: Review) => {
        if (!publicKey) {
            alert("Please connect your wallet!");
            return;
        }

        if (review.rating < 0 || review.rating > 10) {
            alert("Rating must be between 0 and 10.");
            return;
        }

        const buffer = review.serialize();
        const transaction = new web3.Transaction();

        const [pda] = await web3.PublicKey.findProgramAddressSync(
            [publicKey.toBuffer(), Buffer.from(review.title)],
            new web3.PublicKey(REVIEW_PROGRAM_ID)
        );

        const instruction = new web3.TransactionInstruction({
            keys: [
                {
                    pubkey: publicKey,
                    isSigner: true,
                    isWritable: false,
                },
                {
                    pubkey: pda,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: web3.SystemProgram.programId,
                    isSigner: false,
                    isWritable: false,
                },
            ],
            data: buffer,
            programId: new web3.PublicKey(REVIEW_PROGRAM_ID),
        });

        transaction.add(instruction);

        try {
            let txid = await sendTransaction(transaction, connection);
            setTxid(
                `Transaction submitted: https://explorer.solana.com/tx/${txid}?cluster=devnet`
            );
        } catch (e) {
            console.log(JSON.stringify(e,null,2));
            alert(JSON.stringify(e,null,2));
            console.error("Transaction error: ",e);
        }
    };

    // Add function to handle edit button click
    const handleEdit = (review: Review) => {
        //setIsUpdating(true);
        setSelectedReview(review);
        setTitle(review.title);
        setRating(review.rating);
        setDescription(review.description);
        setLocation(review.location);
    };

    // Add function to cancel update
    const handleCancel = () => {
        //setIsUpdating(false);
        setSelectedReview(null);
        setTitle("");
        setRating(0);
        setDescription("");
        setLocation("");
    };

    return (
        <main
            className={`flex min-h-screen flex-col items-center justify-between p-24 `}
        >
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <AppBar />
            </div>

            <div className="after:absolute after:-z-20 after:h-[180px] after:w-[240px] after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700/10 after:dark:from-sky-900 after:dark:via-[#0141ff]/40 before:lg:h-[360px]">
                <ReviewForm
                    title={title}
                    description={description}
                    rating={rating}
                    location={location}
                    setTitle={setTitle}
                    setDescription={setDescription}
                    setRating={setRating}
                    setLocation={setLocation}
                    // handleSubmit={handleSubmit}
                    // isUpdating={isUpdating}
                    // onCancel={handleCancel}
                    // onUpdate={handleUpdate}
                />

                <div className="flex gap-4 mt-4">
                    <button
                        onClick={handleSubmit}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Submit New Review
                    </button>
                    <button
                        onClick={handleUpdate}
                        disabled={!selectedReview}
                        className={`${
                            selectedReview 
                                ? "bg-green-500 hover:bg-green-700" 
                                : "bg-gray-400"
                        } text-white font-bold py-2 px-4 rounded`}
                    >
                        Update Review
                    </button>
                    {selectedReview && (
                        <button
                            onClick={handleCancel}
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            {txid && <div>{txid}</div>}

            <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-3 lg:text-left">
                {reviews &&
                    reviews.map((review) => {
                        return (
                            <ReviewCard key={review.title} review={review} 
                            onEdit={() => handleEdit(review)} />
                        );
                    })}
            </div>
        </main>
    );
}
