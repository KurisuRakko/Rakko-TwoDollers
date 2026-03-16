import { BaseButton } from "./base";

export default function ComplexAddButton({
    onClick,
}: {
    onClick?: () => void;
}) {
    return (
        <BaseButton onClick={onClick}>
            <i className="icon-[mdi--add] size-7"></i>
        </BaseButton>
    );
}
