'use client'

const { useFormStatus } = require("react-dom")

export default function MealsFormSubmit(){
    const {pending} = useFormStatus() ;

    return <button disabled={pending}>
        {pending ? 'Submitting...' : 'Share Meal'}
    </button>

}