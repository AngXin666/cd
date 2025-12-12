export const View = ({children, className, onClick, ...props}: any) => (
  <div className={className} onClick={onClick} {...props}>
    {children}
  </div>
)

export const Text = ({children, className, ...props}: any) => (
  <span className={className} {...props}>
    {children}
  </span>
)

export const Input = ({value, onInput, placeholder, className, type, ...props}: any) => (
  <input
    type={type || 'text'}
    value={value}
    onChange={(e) => onInput?.({detail: {value: e.target.value}})}
    placeholder={placeholder}
    className={className}
    {...props}
  />
)

export const ScrollView = ({children, className, scrollY, ...props}: any) => (
  <div className={className} style={{overflow: scrollY ? 'auto' : 'hidden'}} {...props}>
    {children}
  </div>
)

export const Picker = ({children, onChange, value, range, rangeKey, mode, ...props}: any) => (
  <select value={value} onChange={(e) => onChange?.({detail: {value: parseInt(e.target.value, 10)}})} {...props}>
    {range?.map((item: any, index: number) => (
      <option key={index} value={index}>
        {rangeKey ? item[rangeKey] : item}
      </option>
    ))}
  </select>
)

export const Checkbox = ({value, checked, className, ...props}: any) => (
  <input type="checkbox" value={value} checked={checked} className={className} {...props} />
)

export const CheckboxGroup = ({children, onChange, ...props}: any) => (
  <div
    onChange={(e: any) => {
      const checkboxes = e.currentTarget.querySelectorAll('input[type="checkbox"]:checked')
      const values = Array.from(checkboxes).map((cb: any) => cb.value)
      onChange?.({detail: {value: values}})
    }}
    {...props}>
    {children}
  </div>
)
