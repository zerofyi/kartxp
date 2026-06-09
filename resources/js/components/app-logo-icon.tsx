import { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 342 512"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M40.2822 342.5H0V326.5H51.8379L40.2822 342.5ZM61.5879 313H0V297H73.1426L61.5879 313ZM83.2539 283H0V267H94.8096L83.2539 283ZM96.8076 253H0V237H85.8242L96.8076 253ZM76.2148 223H0V207H65.2324L76.2148 223ZM55.2793 192.5H0V176.5H44.2959L55.2793 192.5Z"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M167.801 343V175.72H137.321V259L84.0409 175.72H48.7609L105.761 258.76L44.9209 343H83.3209L137.321 262.72V343H167.801Z"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M136.998 400V121.2H187.798V260L276.598 121.2H335.398L240.398 259.6L341.798 400H277.798L187.798 266.2V400H136.998Z"
            />
        </svg>
    );
}
